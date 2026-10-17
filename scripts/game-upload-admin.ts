import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../app/models/database.types";
import {
  gameContentHash,
  normalizeGame,
  canonicalJson,
} from "../app/models/game-upload-contract";
import { legacyGamesEquivalent } from "../app/models/game-upload-reconciliation";

const usage = `Usage: pnpm upload:admin <command> ...
  create <name>                              Create a disabled API client
  token <uploader UUID> <new-secret-file>     Issue games:upload token (0600); print hash
  revoke <token SHA256>                      Revoke one token
  enable|disable <uploader UUID>             Enable only after reservation setup
  reserve <uploader UUID> <keys.json>         Reserve keys; uploader must be disabled
  reconcile <uploader UUID> <mappings.json> [--write]   Preview by default
  release <uploader UUID> <key> --write --reason <evidence>

keys.json: array of key strings. mappings.json: array of
{idempotencyKey, gameId, game}. Only operators have the service-role credential.
All commands except reconcile preview mutate the configured database.`;
const [command, first, second, ...options] = process.argv.slice(2);
if (!command || command === "--help") {
  console.log(usage);
  process.exit(0);
}
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const client = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const keySchema = z.string().regex(/^[\x21-\x7e]{1,200}$/);
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
async function disabled(id: string) {
  const { data, error } = await client
    .from("api_clients")
    .select("enabled")
    .eq("id", id)
    .single();
  check(error);
  if (data?.enabled)
    throw new Error("Disable uploader before changing reservations");
}

try {
  if (command === "create") {
    const name = z.string().min(1).parse(first);
    const { data, error } = await client
      .from("api_clients")
      .insert({ name })
      .select("id, name, enabled")
      .single();
    check(error);
    console.log(JSON.stringify(data));
  } else if (command === "token") {
    const id = z.uuid().parse(first);
    const file = z.string().min(1).parse(second);
    const token = `jep_api_${randomBytes(32).toString("base64url")}`;
    const hash = createHash("sha256").update(token).digest("hex");
    await writeFile(file, token + "\n", { mode: 0o600, flag: "wx" });
    const { error } = await client
      .from("api_tokens")
      .insert({ client_id: id, token_hash: hash, scopes: ["games:upload"] });
    if (error) {
      await unlink(file);
      check(error);
    }
    console.log(
      JSON.stringify({ uploaderId: id, tokenHash: hash, secretFile: file }),
    );
  } else if (command === "revoke") {
    const hash = z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .parse(first);
    const { error } = await client
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hash);
    check(error);
    console.log("Token revoked");
  } else if (command === "enable" || command === "disable") {
    const id = z.uuid().parse(first);
    const { data, error } = await client
      .from("api_clients")
      .update({ enabled: command === "enable" })
      .eq("id", id)
      .select("id")
      .single();
    check(error);
    console.log(JSON.stringify(data));
  } else if (command === "reserve") {
    const id = z.uuid().parse(first);
    await disabled(id);
    const keys = z
      .array(keySchema)
      .min(1)
      .parse(JSON.parse(await readFile(second, "utf8")));
    for (let offset = 0; offset < keys.length; offset += 500) {
      const { error } = await client.from("game_upload_reservations").upsert(
        keys
          .slice(offset, offset + 500)
          .map((key) => ({ uploader_id: id, key })),
        { onConflict: "uploader_id,key", ignoreDuplicates: true },
      );
      check(error);
    }
    console.log(JSON.stringify({ reserved: keys.length, uploaderId: id }));
  } else if (command === "reconcile") {
    const id = z.uuid().parse(first);
    const mappings = z
      .array(
        z.object({
          idempotencyKey: keySchema,
          gameId: z.uuid(),
          game: z.unknown(),
        }),
      )
      .min(1)
      .parse(JSON.parse(await readFile(second, "utf8")));
    if (options.some((option) => option !== "--write")) throw new Error(usage);
    for (const mapping of mappings) {
      const game = normalizeGame(mapping.game);
      const { data: snapshot, error } = await client.rpc(
        "game_upload_snapshot",
        { p_game_id: mapping.gameId },
      );
      check(error);
      const [
        { data: existingGame, error: gameError },
        { data: receipt, error: receiptError },
      ] = await Promise.all([
        client
          .from("games")
          .select("visibility")
          .eq("id", mapping.gameId)
          .single(),
        client
          .from("game_upload_receipts")
          .select("content, game_id")
          .eq("uploader_id", id)
          .eq("key", mapping.idempotencyKey)
          .maybeSingle(),
      ]);
      check(gameError);
      check(receiptError);
      if (existingGame?.visibility !== "PUBLIC")
        throw new Error(`Existing game must be public: ${mapping.gameId}`);
      if (
        receipt &&
        (receipt.game_id !== mapping.gameId ||
          canonicalJson(receipt.content) !== canonicalJson(game))
      )
        throw new Error(
          `Existing receipt conflicts: ${mapping.idempotencyKey}`,
        );
      if (!snapshot || !legacyGamesEquivalent(snapshot, game))
        throw new Error(
          `Content mismatch or missing game: ${mapping.idempotencyKey} / ${mapping.gameId}`,
        );
      if (options.includes("--write")) {
        const { error: reconcileError } = await client.rpc(
          "reconcile_game_upload",
          {
            p_uploader: id,
            p_key: mapping.idempotencyKey,
            p_game_id: mapping.gameId,
            p_expected_snapshot: snapshot,
            p_game: game,
            p_content_hash: gameContentHash(game),
          },
        );
        check(reconcileError);
      }
      console.log(
        JSON.stringify({
          key: mapping.idempotencyKey,
          gameId: mapping.gameId,
          contentHash: gameContentHash(game),
          result: options.includes("--write")
            ? "reconciled"
            : "verified_preview",
        }),
      );
    }
  } else if (command === "release") {
    const id = z.uuid().parse(first);
    const key = keySchema.parse(second);
    if (
      options[0] !== "--write" ||
      options[1] !== "--reason" ||
      !options[2]?.trim() ||
      options.length !== 3
    )
      throw new Error(usage);
    await disabled(id);
    const { error } = await client
      .from("game_upload_reservations")
      .delete()
      .eq("uploader_id", id)
      .eq("key", key);
    check(error);
    console.log(
      JSON.stringify({ released: key, uploaderId: id, reason: options[2] }),
    );
  } else {
    throw new Error(usage);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Operator command failed",
  );
  process.exitCode = 1;
}
