import { Database, Json } from "~/models/database.types";
import { db } from "~/supabase.server";
import { RoomEventType } from "~/models/room-event";

type RoomEventTable = Database["public"]["Tables"]["room_events"];
export type RoomEvent = RoomEventTable["Row"];

/* Reads */

export async function getRoomEvents(roomId: number): Promise<RoomEvent[]> {
  const { data, error } = await db
    .from<"room_events", RoomEventTable>("room_events")
    .select("*")
    .eq("room_id", roomId);

  if (error !== null) {
    throw error;
  }

  return data;
}

/* Writes */

export async function createRoomEvent(
  roomId: number,
  type: RoomEventType,
  payload?: Json
) {
  const { data, error } = await db
    .from<"room_events", RoomEventTable>("room_events")
    .insert<RoomEventTable["Insert"]>({
      room_id: roomId,
      type,
      payload,
    })
    .select();

  if (error !== null) {
    throw error;
  }

  return data[0];
}
