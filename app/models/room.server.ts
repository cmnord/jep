import { AuthSession } from "~/models/auth";
import type { Database } from "~/models/database.types";
import { getSupabase } from "~/supabase";
import { getRandomWord } from "~/utils";

type RoomTable = Database["public"]["Tables"]["rooms"];
type Room = RoomTable["Row"];

/* Reads */

export async function getRoom(
  roomId: number,
  accessToken?: AuthSession["accessToken"],
): Promise<Room | null> {
  const client = getSupabase(accessToken);
  const { data, error } = await client
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

export async function createRoom(gameId: string, accessToken?: string) {
  const client = getSupabase(accessToken);
  const word = getRandomWord();

  const { data, error } = await client
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
