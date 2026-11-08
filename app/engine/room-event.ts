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

type TypedRoomEvent = DbRoomEvent & { type: ActionType };

/** compareRoomEvents orders room events the way the server does (by ts), with
 * the id as a tiebreaker so the order is total and stable. */
export function compareRoomEvents(a: DbRoomEvent, b: DbRoomEvent) {
  return parseUtcMs(a.ts) - parseUtcMs(b.ts) || a.id - b.id;
}

/** mergeRoomEvents merges newly received room events (from realtime, a
 * catch-up fetch or a fresh loader snapshot) into the sorted list of events a
 * client already knows about. Events are deduplicated by id and events with an
 * unknown type are dropped.
 *
 * `appendOnly` is true when every added event sorts after all known events, so
 * the caller can simply apply `added` to its current state. Otherwise an event
 * arrived late (e.g. realtime missed it but delivered a later one) and the
 * caller must rebuild state by replaying `events` from scratch.
 */
export function mergeRoomEvents(
  known: readonly DbRoomEvent[],
  incoming: readonly DbRoomEvent[],
): {
  events: DbRoomEvent[];
  added: TypedRoomEvent[];
  appendOnly: boolean;
} {
  const seen = new Set(known.map((e) => e.id));
  const added: TypedRoomEvent[] = [];
  for (const re of incoming) {
    if (seen.has(re.id) || !isTypedRoomEvent(re)) continue;
    seen.add(re.id);
    added.push(re);
  }
  added.sort(compareRoomEvents);

  const last = known.at(-1);
  const first = added.at(0);
  const appendOnly = !last || !first || compareRoomEvents(first, last) > 0;
  const events = appendOnly
    ? [...known, ...added]
    : [...known, ...added].sort(compareRoomEvents);

  return { events, added, appendOnly };
}
