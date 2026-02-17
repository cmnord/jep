import { z } from "zod";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";
import type { Route } from "./+types/room.$roomId.start";

const formSchema = z.object({
  userId: z.string(),
  round: z.coerce.number().int(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const { userId, round } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    return { type: ActionType.StartRound, payload: { round, userId } };
  }

  const authSession = await getValidAuthSession(request);
  await requireSessionUserId(request, userId, authSession);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(
    room.id,
    ActionType.StartRound,
    {
      round,
      userId,
    },
    authSession?.accessToken,
  );

  return null;
}
