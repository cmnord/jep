import type { FileUpload } from "@mjackson/form-data-parser";

import type { AuthSession } from "~/models/auth";
import { Convert } from "~/models/convert.server";
import type { GameVisibility } from "~/models/game.server";
import { createGame } from "~/models/game.server";
import { generateTtsForGame, isTtsEnabled } from "~/models/tts.server";

/** newUploadHandler creates a function which uploads games to the database.
 */
export function newUploadHandler(
  authSession: AuthSession | null,
  visibility: GameVisibility,
) {
  const userId = authSession?.userId;

  return async (fileUpload: FileUpload) => {
    // Only handle the "upload" field with JSON content
    if (
      fileUpload.fieldName !== "upload" ||
      fileUpload.type !== "application/json"
    ) {
      console.warn(
        `Invalid upload: fieldName=${fileUpload.fieldName}, type=${fileUpload.type}`,
      );
      return undefined;
    }

    // Read the file bytes and convert to string
    const bytes = await fileUpload.bytes();
    const jsonString = new TextDecoder().decode(bytes);

    const game = Convert.toGame(jsonString);
    const gameId = await createGame(
      game,
      visibility,
      userId,
      authSession?.accessToken,
    );

    // Best-effort TTS generation — don't block upload on failure
    if (isTtsEnabled()) {
      try {
        const clues = game.boards.flatMap((board, round) =>
          board.categories.flatMap((category, categoryIndex) =>
            category.clues.map((clue, clueIndex) => ({
              clueText: clue.clue,
              round,
              categoryIndex,
              clueIndex,
            })),
          ),
        );
        await generateTtsForGame(gameId, clues);
      } catch (err) {
        console.error("TTS generation failed for game", gameId, err);
      }
    }

    return gameId;
  };
}
