import type { DbRoomEvent } from "~/models/room-event.server";
import {
  isPlayerAction,
  isClueAction,
  isRoundAction,
  isBuzzAction,
  isAnswerAction,
} from "~/engine/actions";
import { ActionType, gameEngine } from "~/engine/engine";
import type { Action, State } from "~/engine/engine";

interface RoomEvent extends DbRoomEvent {
  type: ActionType;
}

export function isTypedRoomEvent(re: DbRoomEvent): re is RoomEvent {
  return Object.values(ActionType).includes(re.type as ActionType);
}

/** processRoomEvent dispatches the appropriate Action to the reducer based on
 * the room event. */
export function processRoomEvent(
  roomEvent: DbRoomEvent,
  dispatch: React.Dispatch<Action>
) {
  if (!isTypedRoomEvent(roomEvent)) {
    throw new Error("unhandled room event type from DB: " + roomEvent.type);
  }
  switch (roomEvent.type) {
    case ActionType.Join:
      if (isPlayerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Join event must have a payload");
    case ActionType.ChangeName:
      if (isPlayerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("ChangeName event must have a payload");
    case ActionType.StartRound:
      if (isRoundAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("StartRound event must have a payload");
    case ActionType.ChooseClue:
      if (isClueAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("ChooseClue event must have a payload");
    case ActionType.Buzz:
      if (isBuzzAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Buzz event must have a payload");
    case ActionType.Answer:
      if (isAnswerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Answer event must have a payload");
    case ActionType.NextClue:
      if (isClueAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("NextClue event must have a payload");
    default:
      throw new Error("unhandled room event type: " + roomEvent.type);
  }
}

/** applyRoomEventsToState mutates State to account for each room event. */
export function applyRoomEventsToState(
  state: State,
  serverRoomEvents: DbRoomEvent[]
) {
  for (const re of serverRoomEvents) {
    if (!isTypedRoomEvent(re)) {
      throw new Error("unhandled room event type from DB: " + re.type);
    }
    state = gameEngine(state, re);
  }
  return state;
}
