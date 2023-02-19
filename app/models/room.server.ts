import { client } from "~/supabase.server";
import { getRandomWord } from "~/utils/utils";
import { Database } from "~/models/database.types";

type RoomTable = Database["public"]["Tables"]["rooms"];
type Room = RoomTable["Row"];

/* Reads */

export async function getRoom(nameAndId: string): Promise<Room> {
  const id = nameAndId.split("-")[0];

  const { data, error } = await client
    .from<"rooms", RoomTable>("rooms")
    .select("*")
    .eq("id", id);

  if (error !== null) {
    throw error;
  }

  return data[0];
}

/* Writes */

export async function createRoom(gameId: string) {
  const word = getRandomWord();

  const { data, error } = await client
    .from<"rooms", RoomTable>("rooms")
    .insert({ name: word, game_id: gameId })
    .select();

  if (error !== null) {
    throw error;
  }

  return data[0].id + "-" + word;
}
