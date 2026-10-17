import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../app/models/database.types";
import {
  normalizeGame,
  gameContentHash,
} from "../app/models/game-upload-contract";
import fixture from "../docs/fixtures/game-upload-v1.json" with { type: "json" };

const admin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);
const token = () => `jep_api_${randomBytes(32).toString("base64url")}`;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let uploader: string;
let credential: string;
const game = normalizeGame(fixture.input);
const headers = (key: string, secret = credential) => ({
  Authorization: `Bearer ${secret}`,
  "Idempotency-Key": key,
});

async function provision(existing?: string, scopes = ["games:upload"]) {
  let id = existing;
  if (!id) {
    const result = await admin
      .from("api_clients")
      .insert({ name: "E2E uploader", enabled: true })
      .select("id")
      .single();
    expect(result.error).toBeNull();
    id = result.data!.id;
  }
  const secret = token();
  expect(
    (
      await admin
        .from("api_tokens")
        .insert({ client_id: id, token_hash: hash(secret), scopes })
    ).error,
  ).toBeNull();
  return { id, secret };
}

test.beforeAll(async () => {
  const provisioned = await provision();
  uploader = provisioned.id;
  credential = provisioned.secret;
});

test("new upload, normalized replay, conflict, and token rotation", async ({
  request,
}) => {
  const key = randomUUID();
  const first = await request.post("/api/v1/games", {
    headers: headers(key),
    data: fixture.input,
  });
  expect(first.status()).toBe(201);
  const result = await first.json();
  expect(result).toEqual({
    apiVersion: "1",
    result: "created",
    gameId: expect.any(String),
    contentHash: fixture.contentHash,
    idempotencyKey: key,
    gameUrl: `${process.env.BASE_URL}/game/${result.gameId}/play`,
  });
  const replay = await request.post("/api/v1/games", {
    headers: headers(key),
    data: game,
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual({ ...result, result: "replayed" });
  const conflict = await request.post("/api/v1/games", {
    headers: headers(key),
    data: { ...game, title: "Changed" },
  });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).error.code).toBe("idempotency_conflict");
  const rotated = await provision(uploader);
  const rotatedReplay = await request.post("/api/v1/games", {
    headers: headers(key, rotated.secret),
    data: game,
  });
  expect(rotatedReplay.status()).toBe(200);
  expect((await rotatedReplay.json()).gameId).toBe(result.gameId);
  await admin
    .from("api_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hash(rotated.secret));
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(key, rotated.secret),
        data: game,
      })
    ).status(),
  ).toBe(401);
  const other = await provision();
  const isolated = await request.post("/api/v1/games", {
    headers: headers(key, other.secret),
    data: game,
  });
  expect(isolated.status()).toBe(201);
  expect((await isolated.json()).gameId).not.toBe(result.gameId);
});

test("API token scopes are checked before both new uploads and replays", async ({
  request,
}) => {
  const secret = token();
  const tokenHash = hash(secret);
  const key = randomUUID();
  // No implicit permissions: a generic API token defaults to no scopes.
  expect(
    (
      await admin
        .from("api_tokens")
        .insert({ client_id: uploader, token_hash: tokenHash })
    ).error,
  ).toBeNull();
  const post = () =>
    request.post("/api/v1/games", {
      headers: headers(key, secret),
      data: game,
    });
  expect((await post()).status()).toBe(401);
  await admin
    .from("api_tokens")
    .update({ scopes: ["future:read"] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(401);
  const denied = await admin.rpc("upload_game", {
    p_token_hash: tokenHash,
    p_key: key,
    p_game: game,
    p_content_hash: fixture.contentHash,
  });
  expect(denied.error).toBeNull();
  expect(denied.data).toEqual({ error: "unauthorized" });
  expect(
    (
      await admin
        .from("game_upload_receipts")
        .select("key")
        .eq("uploader_id", uploader)
        .eq("key", key)
    ).data,
  ).toEqual([]);
  await admin
    .from("api_tokens")
    .update({ scopes: ["games:upload"] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(201);
  await admin
    .from("api_tokens")
    .update({ scopes: [] })
    .eq("token_hash", tokenHash);
  expect((await post()).status()).toBe(401);
  const deniedReplay = await admin.rpc("upload_game", {
    p_token_hash: tokenHash,
    p_key: key,
    p_game: game,
    p_content_hash: fixture.contentHash,
  });
  expect(deniedReplay.data).toEqual({ error: "unauthorized" });
});

test("concurrent first requests create exactly one complete game", async ({
  request,
}) => {
  const key = randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      request.post("/api/v1/games", { headers: headers(key), data: game }),
    ),
  );
  expect(
    responses.filter((response) => response.status() === 201),
  ).toHaveLength(1);
  expect(
    responses.filter((response) => response.status() === 200),
  ).toHaveLength(11);
  const bodies = await Promise.all(
    responses.map((response) => response.json()),
  );
  expect(new Set(bodies.map((body) => body.gameId)).size).toBe(1);
  const snapshot = await admin.rpc("game_upload_snapshot", {
    p_game_id: bodies[0].gameId,
  });
  expect(snapshot.error).toBeNull();
  expect(normalizeGame(snapshot.data)).toEqual(game);
  const conflictKey = randomUUID();
  const conflicting = await Promise.all(
    [game, { ...game, title: "Concurrent conflict" }].map((data) =>
      request.post("/api/v1/games", { headers: headers(conflictKey), data }),
    ),
  );
  expect(conflicting.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
});

test("a late clue insert failure rolls back game, categories, clues and receipt", async ({
  request,
}) => {
  const key = randomUUID();
  const title = `Rollback ${randomUUID()}`;
  const invalid = structuredClone(game);
  invalid.title = title;
  // Deliberately bypass HTTP validation to force a database failure after a
  // valid clue has already been inserted by the shared transaction function.
  const broken = JSON.parse(JSON.stringify(invalid));
  broken.boards[0].categories[0].clues[1].answer = null;
  const counts = await Promise.all(
    ["games", "categories", "clues"].map((table) =>
      admin.from(table as "games").select("id", { count: "exact", head: true }),
    ),
  );
  const failed = await admin.rpc("upload_game", {
    p_token_hash: hash(credential),
    p_key: key,
    p_game: broken,
    p_content_hash: gameContentHash(invalid),
  });
  expect(failed.error).not.toBeNull();
  const after = await Promise.all(
    ["games", "categories", "clues"].map((table) =>
      admin.from(table as "games").select("id", { count: "exact", head: true }),
    ),
  );
  expect(after.map((entry) => entry.count)).toEqual(
    counts.map((entry) => entry.count),
  );
  const receipts = await admin
    .from("game_upload_receipts")
    .select("key")
    .eq("uploader_id", uploader)
    .eq("key", key);
  expect(receipts.data).toEqual([]);
  const fixed = await request.post("/api/v1/games", {
    headers: headers(key),
    data: invalid,
  });
  expect(fixed.status()).toBe(201);
});

test("reserved keys fail closed and operator reconciliation only attaches equivalent content", async ({
  request,
}) => {
  const key = randomUUID();
  await admin
    .from("game_upload_reservations")
    .insert({ uploader_id: uploader, key });
  const blocked = await request.post("/api/v1/games", {
    headers: headers(key),
    data: game,
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).error.code).toBe("reconciliation_required");
  const legacy = structuredClone(game);
  legacy.boards[0].categories[0].clues.reverse();
  const existing = await admin.rpc("create_game", {
    p_game: legacy,
    p_visibility: "PUBLIC",
  });
  expect(existing.error).toBeNull();
  const dir = mkdtempSync(join(tmpdir(), "jep-reconcile-"));
  const file = join(dir, "mappings.json");
  const run = (...args: string[]) =>
    execFileSync(
      "node_modules/.bin/tsx",
      ["scripts/game-upload-admin.ts", "reconcile", uploader, file, ...args],
      { env: process.env, encoding: "utf8", stdio: "pipe" },
    );
  try {
    writeFileSync(
      file,
      JSON.stringify([
        {
          idempotencyKey: key,
          gameId: existing.data,
          game: { ...game, title: "Conflicting existing content" },
        },
      ]),
    );
    expect(() => run("--write")).toThrow();
    expect(
      (
        await admin
          .from("game_upload_receipts")
          .select("key")
          .eq("uploader_id", uploader)
          .eq("key", key)
      ).data,
    ).toEqual([]);
    writeFileSync(
      file,
      JSON.stringify([{ idempotencyKey: key, gameId: existing.data, game }]),
    );
    expect(run()).toContain("verified_preview");
    expect(
      (
        await request.post("/api/v1/games", {
          headers: headers(key),
          data: game,
        })
      ).status(),
    ).toBe(409);
    expect(run("--write")).toContain("reconciled");
    const replay = await request.post("/api/v1/games", {
      headers: headers(key),
      data: game,
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).gameId).toBe(existing.data);
    expect(run("--write")).toContain("reconciled");
    const stale = await admin.rpc("reconcile_game_upload", {
      p_uploader: uploader,
      p_key: randomUUID(),
      p_game_id: existing.data!,
      p_expected_snapshot: game,
      p_game: game,
      p_content_hash: fixture.contentHash,
    });
    expect(stale.error).not.toBeNull();
    await admin.from("games").delete().eq("id", existing.data!);
    const deleted = await request.post("/api/v1/games", {
      headers: headers(key),
      data: game,
    });
    expect(deleted.status()).toBe(409);
    expect((await deleted.json()).error.code).toBe("game_deleted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("structured HTTP errors and privileged RPC/table isolation", async ({
  request,
}) => {
  expect((await request.get("/api/v1/games")).status()).toBe(405);
  expect((await request.post("/api/v1/games", { data: game })).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID(), token()),
        data: game,
      })
    ).status(),
  ).toBe(401);
  const missingKey = await request.post("/api/v1/games", {
    headers: { Authorization: `Bearer ${credential}` },
    data: game,
  });
  expect(missingKey.status()).toBe(400);
  const malformed = await request.post("/api/v1/games", {
    headers: { ...headers(randomUUID()), "Content-Type": "application/json" },
    data: Buffer.from("{"),
  });
  expect((await malformed.json()).error.code).toBe("invalid_json");
  const invalid = await request.post("/api/v1/games", {
    headers: headers(randomUUID()),
    data: { ...game, boards: [] },
  });
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).error.issues.length).toBeGreaterThan(0);
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID()),
        data: "text",
      })
    ).status(),
  ).toBe(415);
  const huge = await request.post("/api/v1/games", {
    headers: headers(randomUUID()),
    data: { ...game, note: "x".repeat(1_000_001) },
  });
  expect(huge.status()).toBe(413);
  const streamedStatus = await new Promise<number>((resolve, reject) => {
    const upload = httpRequest(
      new URL("/api/v1/games", process.env.BASE_URL!),
      {
        method: "POST",
        headers: {
          ...headers(randomUUID()),
          "Content-Type": "application/json",
          "Transfer-Encoding": "chunked",
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode!));
      },
    );
    upload.on("error", reject);
    upload.end(JSON.stringify({ ...game, note: "x".repeat(1_000_001) }));
  });
  expect(streamedStatus).toBe(413);
  expect(
    (
      await anon.rpc("create_game", {
        p_game: game,
        p_visibility: "PUBLIC",
      })
    ).error,
  ).not.toBeNull();
  expect(
    (
      await anon.rpc("upload_game", {
        p_game: game,
        p_key: "x",
        p_token_hash: hash(credential),
        p_content_hash: fixture.contentHash,
      })
    ).error,
  ).not.toBeNull();
  expect((await anon.from("api_tokens").select()).error).not.toBeNull();
  await admin.from("api_clients").update({ enabled: false }).eq("id", uploader);
  expect(
    (
      await request.post("/api/v1/games", {
        headers: headers(randomUUID()),
        data: game,
      })
    ).status(),
  ).toBe(401);
  await admin.from("api_clients").update({ enabled: true }).eq("id", uploader);
});
