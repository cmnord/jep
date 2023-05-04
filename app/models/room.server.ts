import { db } from "~/db.server";
import type { Database } from "~/models/database.types";
import { getRandomWord } from "~/utils";

type RoomTable = Database["public"]["Tables"]["rooms"];
type Room = RoomTable["Row"];

/* Reads */

export async function getRoom(roomId: number): Promise<Room | null> {
  const { data, error } = await db
    .from<"rooms", RoomTable>("rooms")
    .select("*")
    .eq("id", roomId);

  if (error !== null) {
    throw new Error(error.message);
  }

  const room = data.at(0);
  if (!room) {
    return null;
  }

  return room;
}

/* Writes */

export async function createRoom(gameId: string) {
  const word = getRandomWord();

  const { data, error } = await db
    .from<"rooms", RoomTable>("rooms")
    .insert<RoomTable["Insert"]>({ name: word, game_id: gameId })
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const room = data.at(0);
  if (!room) {
    throw new Error("room not created");
  }
  return room.id + "-" + word;
}
