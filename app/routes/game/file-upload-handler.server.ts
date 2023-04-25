import type { UploadHandler, UploadHandlerPart } from "@remix-run/node";
import {
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import * as stream from "stream";

import type { AuthSession } from "~/models/auth";
import { Convert } from "~/models/convert.server";
import type { GameVisibility } from "~/models/game.server";
import { createGame } from "~/models/game.server";

function streamToString(readable: stream.Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    readable.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    readable.on("error", (err) => reject(err));
    readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function newGameUploadHandler(
  authSession: AuthSession | null,
  visibility: GameVisibility
): UploadHandler {
  const userId = authSession?.userId;

  return async ({ name, contentType, data }: UploadHandlerPart) => {
    if (name !== "upload" || contentType !== "application/json") {
      throw new Error("expected upload to be of type application/json");
    }

    const byteStream = stream.Readable.from(data);
    const jsonString = await streamToString(byteStream);

    const game = Convert.toGame(jsonString);
    const gameId = await createGame(
      game,
      visibility,
      userId,
      authSession?.accessToken
    );

    return gameId;
  };
}

/** newUploadHandler creates a function which uploads games to the database.
 */
export async function newUploadHandler(
  authSession: AuthSession | null,
  visibility: GameVisibility
) {
  const uploadHandler = newGameUploadHandler(authSession, visibility);

  return unstable_composeUploadHandlers(
    uploadHandler,
    // Parse everything else into memory
    unstable_createMemoryUploadHandler()
  );
}
