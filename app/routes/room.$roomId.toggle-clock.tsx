import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";

import type { Route } from "./+types/room.$roomId.toggle-clock";

export async function action({ request, params }: Route.ActionArgs) {
  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    return { type: ActionType.ToggleClock, ts: Date.now() };
  }

  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(
    room.id,
    ActionType.ToggleClock,
    null,
    authSession?.accessToken,
  );

  return null;
}
