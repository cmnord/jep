import { z } from "zod";

import {
  authorizeRoomActor,
  requireHostModeFlow,
} from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEventAsServer } from "~/models/room-event.server";
import { revealResolvedAnswer } from "~/models/room-reveal.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.next-clue";

const formSchema = z.object({
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  userId: z.string(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  const { i, j, userId } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.NextClue,
      payload: { i, j, userId },
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

  await createRoomEventAsServer(room.id, ActionType.NextClue, {
    i,
    j,
    userId,
    ...actor,
  });
  // Host mode: the question may be resolved now (everyone passed, the
  // Final's answer is shown): reveal its answer to the players.
  await revealResolvedAnswer(room, authSession);

  return null;
}
