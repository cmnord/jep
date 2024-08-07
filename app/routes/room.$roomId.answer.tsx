import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

export async function action({ request, params }: ActionFunctionArgs) {
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

  const answer = formData.get("answer");
  if (typeof answer !== "string") {
    throw new Response("Invalid answer " + answer, { status: 400 });
  }

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room ID not found in URL", { status: 404 });
  }

  if (roomId === -1) {
    return json({ type: ActionType.Answer, payload: { i, j, userId, answer } });
  }

  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(
    room.id,
    ActionType.Answer,
    { i, j, userId, answer },
    authSession?.accessToken,
  );
  return null;
}
