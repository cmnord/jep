import { z } from "zod";

import { authorizeRoomActor } from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.pass-clue";

const formSchema = z.object({
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  /** The chooser, who must have board control. */
  userId: z.string(),
  /** The player who gets the secret question. */
  toUserId: z.string().min(1),
});

/** Gives the secret question being passed to another player. */
export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  const { i, j, userId, toUserId } = parseFormData(formData, formSchema);

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.PassClue,
      payload: { i, j, userId, toUserId },
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

  // The engine ignores invalid passes on every client; checking here too
  // gives the chooser a clear error and keeps junk out of the room's events.
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }
  const state = applyRoomEventsToState(
    stateFromGame(game),
    await getRoomEvents(room.id, authSession?.accessToken),
  );
  if (
    state.type !== GameState.PassClue ||
    state.activeClue?.[0] !== i ||
    state.activeClue?.[1] !== j
  ) {
    throw new Response(t("room.error.notBeingPassed"), { status: 400 });
  }
  if (state.boardControl !== userId) {
    throw new Response(t("room.error.onlyChooserCanPass"), {
      status: 403,
    });
  }
  if (
    !state.players.has(toUserId) ||
    (toUserId === userId && state.players.size > 1)
  ) {
    throw new Response(t("room.error.passToAnother"), {
      status: 400,
    });
  }

  await createRoomEventAsServer(room.id, ActionType.PassClue, {
    i,
    j,
    userId,
    toUserId,
    ...actor,
  });

  return null;
}
