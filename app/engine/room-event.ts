import type { DbRoomEvent } from "~/models/room-event.server";

import { ActionType, gameEngine } from "./engine";
import type { State } from "./state";

interface RoomEvent extends DbRoomEvent {
  type: ActionType;
}

export function isTypedRoomEvent(re: DbRoomEvent): re is RoomEvent {
  return Object.values(ActionType).includes(re.type as ActionType);
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
    state = gameEngine(state, re);
  }
  return state;
}
