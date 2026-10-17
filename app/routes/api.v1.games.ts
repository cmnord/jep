import { ENV } from "varlock/env";
import { z } from "zod";

import { normalizeGame } from "~/models/game-upload-contract";
import { uploadGame } from "~/models/game.server";
import { apiFailure, readIdempotentApiRequest } from "~/utils/api.server";

export function loader() {
  return apiFailure(405, "method_not_allowed", "Use POST.");
}

export async function action({ request }: { request: Request }) {
  try {
    const { tokenHash, idempotencyKey, body } = await readIdempotentApiRequest(
      request,
      "games:upload",
      1_000_000,
    );
    let game;
    try {
      game = normalizeGame(body);
    } catch (error) {
      if (error instanceof z.ZodError)
        return apiFailure(
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
    const result = await uploadGame(tokenHash, idempotencyKey, game);
    if ("error" in result) {
      const code = result.error;
      if (code === "unauthorized")
        return apiFailure(401, code, "A valid upload token is required.");
      if (code === "idempotency_conflict")
        return apiFailure(
          409,
          code,
          "This key already belongs to different content.",
        );
      if (code === "reconciliation_required")
        return apiFailure(
          409,
          code,
          "This key is reserved for operator reconciliation.",
        );
      if (code === "game_deleted")
        return apiFailure(
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
        idempotencyKey,
      },
      {
        status: result.result === "created" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    // Never include database diagnostics, tokens, or request contents in errors.
    return apiFailure(
      500,
      "internal_error",
      "Upload failed; retry with the same key and content.",
    );
  }
}
