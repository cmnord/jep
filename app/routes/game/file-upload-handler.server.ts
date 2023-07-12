import type { UploadHandler } from "@remix-run/node";
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
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    readable.setEncoding("utf8");
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("error", (err) => reject(err));
    readable.on("end", () => resolve(chunks.join("")));
  });
}

function newGameUploadHandler(
  authSession: AuthSession | null,
  visibility: GameVisibility,
) {
  const userId = authSession?.userId;

  const handler: UploadHandler = async ({ name, contentType, data }) => {
    if (name !== "upload" || contentType !== "application/json") {
      console.warn(`Invalid upload: name=${name}, contentType=${contentType}`);
      return undefined;
    }

    const byteStream = stream.Readable.from(data);
    const jsonString = await streamToString(byteStream);

    const game = Convert.toGame(jsonString);
    const gameId = await createGame(
      game,
      visibility,
      userId,
      authSession?.accessToken,
    );

    return gameId;
  };

  return handler;
}

/** newUploadHandler creates a function which uploads games to the database.
 */
export async function newUploadHandler(
  authSession: AuthSession | null,
  visibility: GameVisibility,
) {
  const uploadHandler = newGameUploadHandler(authSession, visibility);

  return unstable_composeUploadHandlers(
    uploadHandler,
    // Parse everything else into memory
    unstable_createMemoryUploadHandler(),
  );
}
