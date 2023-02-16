import { readFile } from "fs/promises";
import { get, push, ref, set } from "firebase/database";

import { db } from "~/firebase.server";
import { Convert, Game } from "~/models/convert.server";
import { undefinedToFalse } from "~/utils/utils";

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

export async function uploadGame(game: Game) {
  const gamesRef = ref(db, "games");
  const newGameRef = push(gamesRef);

  const gameWithoutUndefined = undefinedToFalse(game);

  await set(newGameRef, {
    createdAt: new Date(),
    ...gameWithoutUndefined,
  });
  return newGameRef.key;
}
