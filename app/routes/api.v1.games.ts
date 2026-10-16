import { ENV } from "varlock/env";
import { z } from "zod";

import { normalizeGame } from "~/models/game-upload-contract";
import {
  authenticateGameUpload,
  uploadGame,
} from "~/models/game-upload.server";

const MAX_BODY_BYTES = 1_000_000;

function failure(
  status: number,
  code: string,
  message: string,
  issues?: unknown,
) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  // Reusing a connection with an unread oversized body caused socket resets
  // in integration tests. Close it after delivering the 413 response.
  if (status === 413) headers.set("Connection", "close");
  if (status === 401) headers.set("WWW-Authenticate", "Bearer");
  if (status === 405) headers.set("Allow", "POST");
  return Response.json(
    { apiVersion: "1", error: { code, message, issues } },
    { status, headers },
  );
}

export function loader() {
  return failure(405, "method_not_allowed", "Use POST.");
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") return loader();
  try {
    const tokenHash = await authenticateGameUpload(
      request.headers.get("Authorization"),
    );
    if (!tokenHash)
      return failure(401, "unauthorized", "A valid upload token is required.");
    const key = request.headers.get("Idempotency-Key");
    if (!key || !/^[\x21-\x7e]{1,200}$/.test(key))
      return failure(
        400,
        "invalid_idempotency_key",
        "Idempotency-Key must contain 1–200 printable ASCII characters without spaces.",
      );
    if (
      request.headers
        .get("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return failure(415, "unsupported_media_type", "Use application/json.");
    if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES)
      return failure(413, "payload_too_large", "Body exceeds 1,000,000 bytes.");
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          // Cancelling the Node request stream destroys its socket before the
          // adapter can send 413. Release it; Connection: close ends the request
          // after the error response without buffering the remaining body.
          reader.releaseLock();
          return failure(
            413,
            "payload_too_large",
            "Body exceeds 1,000,000 bytes.",
          );
        }
        chunks.push(value);
      }
    }
    let input: unknown;
    try {
      input = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
      );
    } catch {
      return failure(400, "invalid_json", "Body must be valid UTF-8 JSON.");
    }
    let game;
    try {
      game = normalizeGame(input);
    } catch (error) {
      if (error instanceof z.ZodError)
        return failure(
          422,
          "invalid_game",
          "Game validation failed.",
          error.issues.map(({ path, message, code }) => ({
            path,
            message,
            code,
          })),
        );
      throw error;
    }
    const result = await uploadGame(tokenHash, key, game);
    if ("error" in result) {
      const code = result.error;
      if (code === "unauthorized")
        return failure(401, code, "A valid upload token is required.");
      if (code === "idempotency_conflict")
        return failure(
          409,
          code,
          "This key already belongs to different content.",
        );
      if (code === "reconciliation_required")
        return failure(
          409,
          code,
          "This key is reserved for operator reconciliation.",
        );
      if (code === "game_deleted")
        return failure(
          409,
          code,
          "The game previously uploaded with this key was deleted.",
        );
      throw new Error("Unexpected upload result");
    }
    return Response.json(
      {
        apiVersion: "1",
        ...result,
        gameUrl: new URL(`/game/${result.gameId}/play`, ENV.BASE_URL).href,
        idempotencyKey: key,
      },
      {
        status: result.result === "created" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    // Never include database diagnostics, tokens, or request contents in errors.
    return failure(
      500,
      "internal_error",
      "Upload failed; retry with the same key and content.",
    );
  }
}
