import { z } from "zod";

import type { Route } from "./+types/room.$roomId.player";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getSolve, markAttempted } from "~/models/solves.server";
import { getUserSession, requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";

const formSchema = z.object({
  name: z.string(),
  userId: z.string(),
});

async function getDeleteActionType(
  request: Request,
  targetUserId: string,
): Promise<ActionType> {
  // Check Supabase auth first, then fall back to guest cookie session.
  const authSession = await getValidAuthSession(request);
  const currentUserId = authSession?.userId ?? (await getUserSession(request));
  return currentUserId === targetUserId ? ActionType.Leave : ActionType.Kick;
}

export async function action({ request, params }: Route.ActionArgs) {
  if (
    request.method !== "POST" &&
    request.method !== "PATCH" &&
    request.method !== "DELETE"
  ) {
    throw new Response("method not allowed", { status: 405 });
  }
  const formData = await request.formData();
  const { name, userId } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    const type =
      request.method === "POST"
        ? ActionType.Join
        : request.method === "PATCH"
          ? ActionType.ChangeName
          : ActionType.Kick;
    return { type, payload: { userId, name } };
  }

  const authSession = await getValidAuthSession(request);
  // Validate userId for self-actions (Join, ChangeName). DELETE is excluded
  // because it's either Leave (self) or Kick (cross-user), handled by
  // getDeleteActionType.
  if (request.method === "POST" || request.method === "PATCH") {
    await requireSessionUserId(request, userId, authSession);
  }
  const type =
    request.method === "POST"
      ? ActionType.Join
      : request.method === "PATCH"
        ? ActionType.ChangeName
        : await getDeleteActionType(request, userId);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

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

  await createRoomEvent(
    room.id,
    type,
    {
      userId,
      name,
    },
    authSession?.accessToken,
  );

  return null;
}
