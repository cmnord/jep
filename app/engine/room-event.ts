import type { DbRoomEvent } from "~/models/room-event.server";

import type { Action } from "./engine";
import { ActionType, gameEngine, parseUtcMs } from "./engine";
import type { State } from "./state";

const actionTypes = new Set<string>(Object.values(ActionType));

export function isTypedRoomEvent(
  re: DbRoomEvent,
): re is DbRoomEvent & { type: ActionType } {
  return actionTypes.has(re.type);
}

/** roomEventToAction converts a DB room event to an engine Action, parsing the
 * timestamp string to epoch milliseconds. */
export function roomEventToAction(
  re: DbRoomEvent & { type: ActionType },
): Action {
  return {
    type: re.type,
    payload: re.payload,
    ts: parseUtcMs(re.ts),
  };
}

/** applyRoomEventsToState mutates State to account for each room event. */
export function applyRoomEventsToState(
  state: State,
  serverRoomEvents: DbRoomEvent[],
) {
  for (const re of serverRoomEvents) {
    if (!isTypedRoomEvent(re)) {
      throw new Error("unhandled room event type from DB: " + re.type);
    }
    state = gameEngine(state, roomEventToAction(re));
  }
  return state;
}
