import {
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  UploadHandler,
} from "@remix-run/node";

import { uploadGame } from "~/models/game.server";

/** customUploadHandler uploads games to the database. */
const customUploadHandler: UploadHandler = async ({
  name,
  contentType,
  data,
  filename,
}) => {
  if (name !== "upload" || contentType !== "application/json") {
    throw new Error("expected upload to be of type application/json");
  }
  if (!filename) {
    throw new Error("uploaded file must have a name");
  }
  await uploadGame(data, filename);
  return filename;
};

export const uploadHandler = unstable_composeUploadHandlers(
  customUploadHandler,
  // Parse everything else into memory
  unstable_createMemoryUploadHandler()
);
