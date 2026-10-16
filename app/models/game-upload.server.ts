import { createHash } from "node:crypto";

import { z } from "zod";

import type { Game } from "~/models/convert.server";
import { gameContentHash } from "~/models/game-upload-contract";
import { getSupabaseAdmin } from "~/supabase/admin.server";

const uploadResultSchema = z.union([
  z.object({
    result: z.enum(["created", "replayed"]),
    gameId: z.uuid(),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  z.object({
    error: z.enum([
      "unauthorized",
      "idempotency_conflict",
      "reconciliation_required",
      "game_deleted",
    ]),
  }),
]);

/** Check credentials before reading the body; only the hash leaves this model. */
export async function authenticateGameUpload(authorization: string | null) {
  const [scheme, token, extra] = authorization?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "bearer" || !token || extra !== undefined) {
    return null;
  }
  // Tokens are opaque to the HTTP endpoint. Only a provisioned, active hash
  // authorizes an upload; checking a particular token prefix adds no authority.
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await getSupabaseAdmin()
    .from("game_upload_tokens")
    .select("game_uploaders!inner(enabled)")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return data?.game_uploaders.enabled ? tokenHash : null;
}

export async function uploadGame(
  tokenHash: string,
  idempotencyKey: string,
  game: Game,
) {
  // The RPC checks credentials again under locks, so revocation between the
  // initial check and creation takes effect without splitting the transaction.
  const { data, error } = await getSupabaseAdmin().rpc("upload_game", {
    p_token_hash: tokenHash,
    p_key: idempotencyKey,
    p_game: game,
    p_content_hash: gameContentHash(game),
  });
  if (error) throw error;
  return uploadResultSchema.parse(data);
}
