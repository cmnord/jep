import { z } from "zod";

import {
  authorizeRoomActor,
  requireHostModeFlow,
} from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEventAsServer } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.start";

const formSchema = z.object({
  userId: z.string(),
  round: z.coerce.number().int(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  const { userId, round } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.StartRound,
      payload: { round, userId },
      ts: Date.now(),
    };
  }

  const authSession = await getValidAuthSession(request);
  const actor = await authorizeRoomActor(
    request,
    formData,
    userId,
    authSession,
    t,
    roomId,
  );
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }
  // Host mode (feature 22): the host runs the game.
  await requireHostModeFlow(room, userId, actor, authSession, t);

  await createRoomEventAsServer(room.id, ActionType.StartRound, {
    round,
    userId,
    ...actor,
  });

  return null;
}
