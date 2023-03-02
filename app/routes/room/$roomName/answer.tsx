import type { ActionArgs } from "@remix-run/node";
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

  const result = formData.get("result");
  if (typeof result !== "string") {
    throw new Response("Invalid result", { status: 400 });
  }

  const correct = result === "correct";

  const roomNameAndId = params.roomName;
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomNameAndId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(room.id, ActionType.Answer, {
    i,
    j,
    userId,
    correct,
  });

  return null;
}
