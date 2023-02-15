/* Reads */

import { get, ref } from "firebase/database";
import { db } from "~/firebase.server";
import { Convert, Game } from "./convert.server";

export async function getAllGames() {
  const games: Game[] = [];

  const dbRef = ref(db, "games");
  const snapshot = await get(dbRef);

  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const json = child.toJSON();
      const game = Convert.toGame(JSON.stringify(json));
      games.push(game);
    });
  }

  return games;
}

/* Writes */

export async function uploadGame(
  data: AsyncIterable<Uint8Array>,
  filename: string
) {
  console.log("TODO: upload new file", filename, data);
  throw new Error("unimplemented");
}
