import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

const formSchema = z.object({
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  userId: z.string(),
  answer: z.string(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { i, j, userId, answer } = parseFormData(formData, formSchema);

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
