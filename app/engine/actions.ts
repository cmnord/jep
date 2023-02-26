import type { Action, Player } from "./engine";
import { RoomEventType } from "~/models/room-event";

export function isClueAction(action: Action): action is {
  type: RoomEventType.ChooseClue | RoomEventType.NextClue;
  payload: { userId: string; i: number; j: number };
} {
  return (
    (action.type === RoomEventType.ChooseClue ||
      action.type === RoomEventType.NextClue) &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload
  );
}

export function isPlayerAction(action: Action): action is {
  type: RoomEventType.Join | RoomEventType.ChangeName;
  payload: Player;
} {
  return (
    (action.type === RoomEventType.Join ||
      action.type === RoomEventType.ChangeName) &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "name" in action.payload
  );
}

export function isRoundAction(action: Action): action is {
  type: RoomEventType.StartRound;
  payload: { round: number };
} {
  return (
    action.type === RoomEventType.StartRound &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "round" in action.payload &&
    typeof action.payload.round === "number"
  );
}

export function isBuzzAction(action: Action): action is {
  type: RoomEventType.Buzz;
  payload: { userId: string; i: number; j: number; deltaMs: number };
} {
  return (
    action.type === RoomEventType.Buzz &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "deltaMs" in action.payload
  );
}

export function isAnswerAction(action: Action): action is {
  type: RoomEventType.Answer;
  payload: { userId: string; i: number; j: number; correct: boolean };
} {
  return (
    action.type === RoomEventType.Answer &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "correct" in action.payload
  );
}
