import { RoomEvent } from "~/models/room-event.server";
import { Action, ActionType, State } from "~/utils/use-game";

export enum RoomEventType {
  Join = "join",
  ChangeName = "change_name",
}

export function isJoinEvent(re: RoomEvent): re is {
  id: number;
  ts: string;
  room_id: number;
  type: RoomEventType.Join;
  payload: { userId: string; name: string };
} {
  return (
    re.type === RoomEventType.Join &&
    re.payload !== null &&
    typeof re.payload === "object" &&
    "userId" in re.payload &&
    "name" in re.payload
  );
}

function isChangeNameEvent(re: RoomEvent): re is {
  id: number;
  ts: string;
  room_id: number;
  type: RoomEventType.ChangeName;
  payload: { userId: string; name: string };
} {
  return (
    re.type === RoomEventType.ChangeName &&
    re.payload !== null &&
    typeof re.payload === "object" &&
    "userId" in re.payload &&
    "name" in re.payload
  );
}

/** processRoomEvent dispatches the appropriate Action to the reducer based on
 * the room event. */
export function processRoomEvent(
  roomEvent: RoomEvent,
  dispatch: React.Dispatch<Action>
) {
  switch (roomEvent.type) {
    case RoomEventType.Join:
      if (isJoinEvent(roomEvent)) {
        return dispatch({
          type: ActionType.PlayerJoin,
          payload: {
            userId: roomEvent.payload.userId,
            name: roomEvent.payload.name,
          },
        });
      }
      throw new Error("Join event must have a payload");
    case RoomEventType.ChangeName:
      if (isChangeNameEvent(roomEvent)) {
        return dispatch({
          type: ActionType.PlayerChangeName,
          payload: {
            userId: roomEvent.payload.userId,
            name: roomEvent.payload.name,
          },
        });
      }
      throw new Error("ChangeName event must have a payload");
    default:
      throw new Error("unhandled room event type: " + roomEvent.type);
  }
}

/** applyRoomEventToState modifies State to account for the room event. */
function applyRoomEventToState(roomEvent: RoomEvent, state: State) {
  switch (roomEvent.type) {
    case RoomEventType.Join:
      if (isJoinEvent(roomEvent)) {
        state.players.set(roomEvent.payload.userId, {
          userId: roomEvent.payload.userId,
          name: roomEvent.payload.name,
        });
      }
    case RoomEventType.ChangeName:
      if (isChangeNameEvent(roomEvent)) {
        state.players.set(roomEvent.payload.userId, {
          userId: roomEvent.payload.userId,
          name: roomEvent.payload.name,
        });
      }
  }
}

/** applyRoomEventsToState mutates State to account for each room event. */
export function applyRoomEventsToState(
  state: State,
  serverRoomEvents: RoomEvent[]
) {
  for (const re of serverRoomEvents) {
    applyRoomEventToState(re, state);
  }
  return state;
}
