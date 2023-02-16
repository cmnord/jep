import {
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  UploadHandler,
} from "@remix-run/node";
import * as stream from "stream";

import { uploadGame } from "~/models/game.server";
import { Convert } from "./convert.server";

function streamToString(readable: stream.Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    readable.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    readable.on("error", (err) => reject(err));
    readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

/** customUploadHandler uploads games to the database. */
const customUploadHandler: UploadHandler = async ({
  name,
  contentType,
  data,
}) => {
  if (name !== "upload" || contentType !== "application/json") {
    throw new Error("expected upload to be of type application/json");
  }

  const byteStream = stream.Readable.from(data);
  const jsonString = await streamToString(byteStream);

  const game = Convert.toGame(jsonString);
  const gameId = await uploadGame(game);

  return gameId;
};

export const uploadHandler = unstable_composeUploadHandlers(
  customUploadHandler,
  // Parse everything else into memory
  unstable_createMemoryUploadHandler()
);
