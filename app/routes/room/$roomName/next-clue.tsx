import type { ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { ActionType } from "~/engine";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionArgs) {
  const formData = await request.formData();

  const iStr = formData.get("i");
  if (typeof iStr !== "string") {
    throw new Response("Invalid i", { status: 400 });
  }
  const i = parseInt(iStr);

  const jStr = formData.get("j");
  if (typeof jStr !== "string") {
    throw new Response("Invalid j", { status: 400 });
  }
  const j = parseInt(jStr);

  const userId = formData.get("userId");
  if (typeof userId !== "string") {
    throw new Response("Invalid userId", { status: 400 });
  }

  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomNameAndId === "solo") {
    return json({ type: ActionType.NextClue, payload: { i, j, userId } });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(room.id, ActionType.NextClue, {
    i,
    j,
    userId,
  });

  return null;
}
