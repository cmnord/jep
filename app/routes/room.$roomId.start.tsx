import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

const formSchema = z.object({
  userId: z.string(),
  round: z.coerce.number().int(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { userId, round } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    return json({ type: ActionType.StartRound, payload: { round, userId } });
  }

  const authSession = await getValidAuthSession(request);
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
