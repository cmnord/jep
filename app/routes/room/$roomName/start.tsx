import type { ActionArgs } from "@remix-run/node";
import { ActionType } from "~/engine/engine";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionArgs) {
  const formData = await request.formData();

  const roundStr = formData.get("round");
  if (typeof roundStr !== "string") {
    throw new Response("Invalid round", { status: 400 });
  }
  const round = parseInt(roundStr);

  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(room.id, ActionType.StartRound, {
    round,
  });

  return null;
}
