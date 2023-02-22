import { RoomEvent } from "~/models/room-event.server";

export enum RoomEventType {
  Join = "join",
}

export function isJoinEvent(re: RoomEvent): re is {
  id: number;
  ts: string;
  room_id: number;
  type: RoomEventType.Join;
  payload: { userId: string };
} {
  return (
    re.type === RoomEventType.Join &&
    re.payload !== null &&
    typeof re.payload === "object" &&
    "userId" in re.payload
  );
}
