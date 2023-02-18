import { readFile } from "fs/promises";
import { get, push, ref, set } from "firebase/database";

import { db } from "~/firebase.server";
import { Convert, Game as ConvertedGame } from "~/models/convert.server";
import { undefinedToFalse } from "~/utils/utils";

/** Game is the representation of a game we share with the server. The server
 * sets the ID.
 */
export type Game = {
  id: string;
} & ConvertedGame;

function matchesSearch(game: Game, casedSearch: string | null) {
  if (casedSearch === null) {
    return true;
  }
  const search = casedSearch.toLowerCase();
  return (
    game.title.toLowerCase().includes(search) ||
    game.author.toLowerCase().includes(search)
  );
}

/* Reads */

export async function getGame(gameId: string): Promise<Game> {
  const dbRef = ref(db, "games/" + gameId);
  const snapshot = await get(dbRef);

  if (!snapshot.exists()) {
    throw new Response("game not found", { status: 404 });
  }

  const json = snapshot.val();
  delete json.id;
  const game = Convert.toGame(JSON.stringify(json));
  return { id: gameId, ...game };
}

/** getAllGames gets all games from Firebase, then filters them in memory. */
export async function getAllGames(search: string | null) {
  const games: Game[] = [];

  const dbRef = ref(db, "games");
  const snapshot = await get(dbRef);

  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const json = child.val();
      const id = json.id;
      delete json.id;
      const gameWithoutId = Convert.toGame(JSON.stringify(json));
      const game = { id, ...gameWithoutId };
      if (matchesSearch(game, search)) {
        games.push(game);
      }
    });
  }

  return games;
}

export async function getMockGame(): Promise<Game> {
  // Find the absolute path of the json directory
  // Note: Vercel doesn't include the json directory when using process.cwd() or
  // path.join(). The workaround is to use __dirname and concatenate the json
  // directory to it.
  const jsonDirectory = __dirname + "/../app/static";
  // Read the json data file data.json
  const fileContents = await readFile(jsonDirectory + "/mock.jep.json", "utf8");

  const game = Convert.toGame(fileContents);
  return { id: "mock", ...game };
}

/* Writes */

export async function uploadGame(game: ConvertedGame) {
  const gamesRef = ref(db, "games");
  const newGameRef = push(gamesRef);

  const id = newGameRef.key;
  if (!id) {
    throw new Error("new game ref does not have an ID");
  }

  const gameWithoutUndefined = undefinedToFalse(game);

  await set(newGameRef, {
    createdAt: new Date(),
    id,
    ...gameWithoutUndefined,
  });
  return id;
}
