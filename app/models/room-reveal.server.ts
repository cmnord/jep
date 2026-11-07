import { ActionType } from "~/engine";
import { applyRoomEventsToState, hasHostSeatEvents } from "~/engine/room-event";
import { stateFromGame } from "~/engine/state";
import type { AuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { getAnswerToReveal, revealPayload } from "~/models/withhold-answers";

/** revealResolvedAnswer inserts the reveal_answer event of the active
 * question when it was just resolved in host mode (feature 22): players'
 * pages don't have the answer until then. Called by the routes whose event
 * can resolve a question (buzz, check, next-clue, admin) after their insert,
 * and by the room loader to heal a missed reveal. Concurrent calls may both
 * insert it; the engine keeps the first. Errors are logged, never thrown —
 * the route's own event is already stored. */
export async function revealResolvedAnswer(
  room: { id: number; game_id: string },
  authSession: Pick<AuthSession, "userId" | "accessToken"> | null,
) {
  try {
    const events = await getRoomEvents(room.id, authSession?.accessToken);
    // A room that never had a host has nothing to reveal.
    if (!hasHostSeatEvents(events)) return;
    const game = await getGame(room.game_id, authSession?.userId);
    if (!game) return;
    const state = applyRoomEventsToState(stateFromGame(game), events);
    const reveal = getAnswerToReveal(state);
    if (reveal) {
      await createRoomEventAsServer(
        room.id,
        ActionType.RevealAnswer,
        revealPayload(reveal),
      );
    }
  } catch (error: unknown) {
    console.error("Failed to reveal the answer:", error);
  }
}
