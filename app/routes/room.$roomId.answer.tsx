import { z } from "zod";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";
import type { Route } from "./+types/room.$roomId.answer";

const formSchema = z.object({
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  userId: z.string(),
  answer: z.string(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const { i, j, userId, answer } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room ID not found in URL", { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.Answer,
      payload: { i, j, userId, answer },
      ts: Date.now(),
    };
  }

  const authSession = await getValidAuthSession(request);
  await requireSessionUserId(request, userId, authSession);
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
