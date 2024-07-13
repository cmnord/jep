import type { ActionType } from "~/engine";
import { AuthSession } from "~/models/auth";
import type { Database, Json } from "~/models/database.types";
import { getSupabase } from "~/supabase";

type RoomEventTable = Database["public"]["Tables"]["room_events"];
export type DbRoomEvent = RoomEventTable["Row"];

/* Reads */

export async function getRoomEvents(
  roomId: number,
  accessToken?: AuthSession["accessToken"],
): Promise<DbRoomEvent[]> {
  const client = getSupabase(accessToken);
  const { data, error } = await client
    .from<"room_events", RoomEventTable>("room_events")
    .select("*")
    .order("ts", { ascending: true })
    .eq("room_id", roomId);

  if (error !== null) {
    throw new Error(error.message);
  }

  return data;
}

/* Writes */

export async function createRoomEvent(
  roomId: number,
  type: ActionType,
  payload?: Json,
  accessToken?: AuthSession["accessToken"],
) {
  const client = getSupabase(accessToken);
  const { data, error } = await client
    .from<"room_events", RoomEventTable>("room_events")
    .insert<RoomEventTable["Insert"]>({
      room_id: roomId,
      type,
      payload,
    })
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const roomEvent = data.at(0);
  if (!roomEvent) {
    throw new Error("room event not created");
  }
  return roomEvent;
}
