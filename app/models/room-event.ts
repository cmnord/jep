import type { DbRoomEvent } from "~/models/room-event.server";
import {
  isPlayerAction,
  isChooseClueAction,
  isRoundAction,
} from "~/utils/use-game";
import type { Action, State } from "~/utils/use-game";
import { GameState } from "~/utils/use-game";

export enum RoomEventType {
  Join = "join",
  ChangeName = "change_name",
  StartRound = "start_round",
  ChooseClue = "choose_clue",
  Buzz = "buzz",
}

interface RoomEvent extends DbRoomEvent {
  type: RoomEventType;
}

export function isTypedRoomEvent(re: DbRoomEvent): re is RoomEvent {
  return re.type in RoomEventType;
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
    default:
      throw new Error("unhandled room event type: " + roomEvent.type);
  }
}

/** applyRoomEventToState modifies State to account for the room event. */
function applyRoomEventToState(roomEvent: DbRoomEvent, state: State) {
  if (!isTypedRoomEvent(roomEvent)) {
    throw new Error("unhandled room event type from DB: " + roomEvent.type);
  }
  switch (roomEvent.type) {
    case RoomEventType.Join:
      if (isPlayerAction(roomEvent)) {
        state.players.set(roomEvent.payload.userId, {
          userId: roomEvent.payload.userId,
          name: roomEvent.payload.name,
        });
        // If this is the first player joining, give them board control.
        if (state.players.size === 1) {
          state.boardControl = roomEvent.payload.userId;
        }
      }
      return state;
    case RoomEventType.ChangeName:
      if (isPlayerAction(roomEvent)) {
        state.players.set(roomEvent.payload.userId, {
          userId: roomEvent.payload.userId,
          name: roomEvent.payload.name,
        });
      }
      return state;
    case RoomEventType.StartRound:
      if (isRoundAction(roomEvent)) {
        const actionRound = roomEvent.payload.round;
        if (actionRound === state.round) {
          state.type = GameState.WaitForClueChoice;
        }
      }
      return state;
    case RoomEventType.ChooseClue:
      if (isChooseClueAction(roomEvent)) {
        const { userId, i, j } = roomEvent.payload;
        if (
          state.type === GameState.WaitForClueChoice &&
          state.boardControl === userId &&
          !state.isAnswered[i][j]
        ) {
          state.type = GameState.ReadClue;
          state.activeClue = [i, j];
        }
      }
      return state;
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
    applyRoomEventToState(re, state);
  }
  return state;
}
