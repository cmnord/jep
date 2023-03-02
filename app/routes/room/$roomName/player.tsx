import type { ActionArgs } from "@remix-run/node";
import { ActionType } from "~/engine";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionArgs) {
  const formData = await request.formData();

  const name = formData.get("name");
  if (typeof name !== "string") {
    throw new Response("Invalid name", { status: 400 });
  }
  const userId = formData.get("userId");
  if (typeof userId !== "string") {
    throw new Response("Invalid userId", { status: 400 });
  }

  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(room.id, ActionType.ChangeName, {
    userId,
    name,
  });

  return null;
}
