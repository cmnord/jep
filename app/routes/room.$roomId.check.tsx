import { z } from "zod";

import { authorizeRoomActor } from "~/admin/room-actor.server";
import { ActionType } from "~/engine";
import { applyRoomEventsToState, hasHostSeatEvents } from "~/engine/room-event";
import { stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { revealResolvedAnswer } from "~/models/room-reveal.server";
import { getRoom } from "~/models/room.server";
import { hasChoices, isChoiceIndex, isCorrectChoice } from "~/utils/choices";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/room.$roomId.check";

const formSchema = z.object({
  i: z.coerce.number().int(),
  j: z.coerce.number().int(),
  userId: z.string(),
  /** "correct" / "incorrect" for a self-checked answer. */
  result: z.string().optional(),
  /** The option picked on a multiple choice question. */
  choice: z.coerce.number().int().optional(),
  /** "true" when the answering player's own device sends this because their
   * answer time ran out (answer timer). Always a wrong answer. */
  timedOut: z
    .literal("true")
    .transform(() => true)
    .optional(),
});

export async function action({ request, params }: Route.ActionArgs) {
  const t = createT(getRequestLocale(request));
  const formData = await request.formData();
  const { i, j, userId, result, choice, timedOut } = parseFormData(
    formData,
    formSchema,
  );
  // Running out of time is never a right answer.
  const claimedCorrect = !timedOut && result === "correct";
  const extra = {
    ...(choice === undefined ? {} : { choice }),
    ...(timedOut ? { timedOut } : {}),
  };

  const roomId = params.roomId ? parseInt(params.roomId) : undefined;
  if (!roomId) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  if (roomId === -1) {
    // Solo play has no game on the server side; the engine checks the pick
    // against the answer itself (and ignores `correct` for it).
    return {
      type: ActionType.Check,
      payload: { i, j, userId, correct: claimedCorrect, ...extra },
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

  // A multiple choice pick is judged against the game; in a room that ever
  // had a host (feature 22) the state tells whether the host judges now.
  const events = await getRoomEvents(room.id, authSession?.accessToken);
  const needsState = choice !== undefined || hasHostSeatEvents(events);
  const game = needsState
    ? await getGame(room.game_id, authSession?.userId)
    : null;
  if (needsState && !game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }
  const state = game
    ? applyRoomEventsToState(stateFromGame(game), events)
    : null;

  // Host mode: the host judges. A player may only pick an option of a
  // multiple choice question themselves (a timeout is sent by the host's
  // device).
  if (
    state?.host &&
    !actor.host &&
    !actor.admin &&
    (choice === undefined || timedOut)
  ) {
    throw new Response(t("room.error.hostJudges"), { status: 403 });
  }

  let correct = claimedCorrect;
  if (choice !== undefined && game && state) {
    // Multiple choice: decide correctness here from the game data, never from
    // the client. Self-marking rooms re-check it the same way on every
    // client; in host mode players' pages don't have the answer, so every
    // client takes this verdict.
    const clue = game.boards.at(state.round)?.categories.at(j)?.clues.at(i);
    if (!clue || !hasChoices(clue) || !isChoiceIndex(clue, choice)) {
      throw new Response(t("room.error.invalidChoice"), { status: 400 });
    }
    correct = isCorrectChoice(clue, choice);
  }

  await createRoomEventAsServer(room.id, ActionType.Check, {
    i,
    j,
    userId,
    correct,
    ...extra,
    ...actor,
  });
  await revealResolvedAnswer(room, authSession);

  return null;
}
