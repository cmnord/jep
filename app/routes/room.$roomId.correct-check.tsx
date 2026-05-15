import { z } from "zod";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { requireSessionUserId } from "~/session.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.correct-check";

const formSchema = z.object({
  round: z.coerce.number().int(),
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  userId: z.string(),
  result: z.string(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const { round, i, j, userId, result } = parseFormData(formData, formSchema);

  const correct = result === "correct";

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.CorrectCheck,
      payload: { round, i, j, userId, correct },
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
    ActionType.CorrectCheck,
    {
      round,
      i,
      j,
      userId,
      correct,
    },
    authSession?.accessToken,
  );

  return null;
}
