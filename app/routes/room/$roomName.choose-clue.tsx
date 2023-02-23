import { ActionArgs } from "@remix-run/node";
import { RoomEventType } from "~/models/room-event";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionArgs) {
  const formData = await request.formData();

  const i = formData.get("i");
  const j = formData.get("j");
  console.log(i, j);

  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  console.log("choosing clue", i, j);
  // TODO: emit a choose clue room event, which dispatches ActionType.ChooseClue
  return null;
}
