import type { DbRoomEvent } from "~/models/room-event.server";
import {
  isPlayerAction,
  isChooseClueAction,
  isRoundAction,
  isBuzzAction,
  gameReducer,
  isAnswerAction,
} from "~/utils/use-game";
import type { Action, State } from "~/utils/use-game";

export enum RoomEventType {
  Join = "join",
  ChangeName = "change_name",
  StartRound = "start_round",
  ChooseClue = "choose_clue",
  Buzz = "buzz",
  Answer = "answer",
}

interface RoomEvent extends DbRoomEvent {
  type: RoomEventType;
}

export function isTypedRoomEvent(re: DbRoomEvent): re is RoomEvent {
  return Object.values(RoomEventType).includes(re.type as RoomEventType);
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
    case RoomEventType.Join:
      if (isPlayerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Join event must have a payload");
    case RoomEventType.ChangeName:
      if (isPlayerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("ChangeName event must have a payload");
    case RoomEventType.StartRound:
      if (isRoundAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("StartRound event must have a payload");
    case RoomEventType.ChooseClue:
      if (isChooseClueAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("ChooseClue event must have a payload");
    case RoomEventType.Buzz:
      if (isBuzzAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Buzz event must have a payload");
    case RoomEventType.Answer:
      if (isAnswerAction(roomEvent)) {
        return dispatch(roomEvent);
      }
      throw new Error("Answer event must have a payload");
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
    state = gameReducer(state, re);
  }
  return state;
}
