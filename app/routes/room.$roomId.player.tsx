import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getSolve, markAttempted } from "~/models/solves.server";

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST" && request.method !== "PATCH") {
    throw new Response("method not allowed", { status: 405 });
  }
  const formData = await request.formData();

  const name = formData.get("name");
  if (typeof name !== "string") {
    throw new Response("Invalid name", { status: 400 });
  }
  const userId = formData.get("userId");
  if (typeof userId !== "string") {
    throw new Response("Invalid userId", { status: 400 });
  }

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const type =
    request.method === "POST" ? ActionType.Join : ActionType.ChangeName;

  if (roomId === -1) {
    return json({ type, payload: { userId, name } });
  }

  const room = await getRoom(roomId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  // Mark the game as started if it hasn't been already
  if (authSession && request.method === "POST") {
    const solve = await getSolve(
      authSession.userId,
      room.game_id,
      authSession.accessToken,
    );
    if (!solve) {
      await markAttempted(
        authSession.userId,
        room.game_id,
        room.id,
        authSession.accessToken,
      );
    }
  }

  await createRoomEvent(room.id, type, {
    userId,
    name,
  });

  return null;
}
