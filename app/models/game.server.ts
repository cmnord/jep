import { readFile } from "fs/promises";
import { get, ref } from "firebase/database";

import { db } from "~/firebase.server";
import { Convert, Game } from "~/models/convert.server";

/* Reads */

export async function getAllGames() {
  const games: Game[] = [];

  const dbRef = ref(db, "games");
  const snapshot = await get(dbRef);

  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const json = child.val();
      const game = Convert.toGame(JSON.stringify(json));
      games.push(game);
    });
  }

  return games;
}

export async function getMockGame() {
  // Find the absolute path of the json directory
  // Note: Vercel doesn't include the json directory when using process.cwd() or
  // path.join(). The workaround is to use __dirname and concatenate the json
  // directory to it.
  const jsonDirectory = __dirname + "/../app/static";
  // Read the json data file data.json
  const fileContents = await readFile(jsonDirectory + "/mock.jep.json", "utf8");

  const game = Convert.toGame(fileContents);
  return game;
}

/* Writes */

export async function uploadGame(
  data: AsyncIterable<Uint8Array>,
  filename: string
) {
  console.log("TODO: upload new file", filename, data);
  throw new Error("unimplemented");
}
