import { z } from "zod";

import type { Route } from "./+types/room.$roomId.wager";

import { ActionType } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEvent } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

const formSchema = z
  .object({
    i: z.coerce.number().int(),
    j: z.coerce.number().int(),
    userId: z.string(),
    wager: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.number().int().optional(),
    ),
    full: z.coerce.number().int().optional(),
  })
  .refine((d) => d.wager !== undefined || d.full !== undefined, {
    message: "wager or full required",
  });

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const {
    i,
    j,
    userId,
    wager: wagerVal,
    full: fullVal,
  } = parseFormData(formData, formSchema);
  const wager = wagerVal ?? fullVal!;

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  if (roomId === -1) {
    return { type: ActionType.SetClueWager, payload: { i, j, userId, wager } };
  }

  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  await createRoomEvent(
    room.id,
    ActionType.SetClueWager,
    {
      i,
      j,
      userId,
      wager,
    },
    authSession?.accessToken,
  );

  return null;
}
