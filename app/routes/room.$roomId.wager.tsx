import { z } from "zod";

import { authorizeRoomActor } from "~/admin/room-actor.server";
import { ActionType, getWagerRange } from "~/engine";
import { GameState } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { createRoomEventAsServer } from "~/models/room-event.server";
import { getRoomState } from "~/models/room-state.server";
import { getRoom } from "~/models/room.server";
import { formatDollars } from "~/utils";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.wager";

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
  const t = createT(getRequestLocale(request));
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
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    return {
      type: ActionType.SetClueWager,
      payload: { i, j, userId, wager },
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

  // The engine rejects a wager out of range by throwing, which would break
  // replaying the room for everyone: check it here first.
  const { game, state } = await getRoomState(room, authSession, t);
  const player = state.players.get(userId);
  const clue = game.boards.at(state.round)?.categories.at(j)?.clues.at(i);
  if (
    state.type === GameState.WagerClue &&
    state.activeClue?.[0] === i &&
    state.activeClue?.[1] === j &&
    player &&
    clue
  ) {
    const { min, max } = getWagerRange(
      game.boards.at(state.round),
      clue,
      player.score,
    );
    if (wager < min || wager > max) {
      throw new Response(
        t("room.error.wagerRange", {
          min: formatDollars(min),
          max: formatDollars(max),
        }),
        { status: 400 },
      );
    }
  }

  await createRoomEventAsServer(room.id, ActionType.SetClueWager, {
    i,
    j,
    userId,
    wager,
    ...actor,
  });

  return null;
}
