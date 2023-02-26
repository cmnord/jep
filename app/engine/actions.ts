import type { Action, Player } from "~/engine/engine";
import { ActionType } from "~/engine/engine";

export function isClueAction(action: Action): action is {
  type: ActionType.ChooseClue | ActionType.NextClue;
  payload: { userId: string; i: number; j: number };
} {
  return (
    (action.type === ActionType.ChooseClue ||
      action.type === ActionType.NextClue) &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload
  );
}

export function isPlayerAction(action: Action): action is {
  type: ActionType.Join | ActionType.ChangeName;
  payload: Player;
} {
  return (
    (action.type === ActionType.Join ||
      action.type === ActionType.ChangeName) &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "name" in action.payload
  );
}

export function isRoundAction(action: Action): action is {
  type: ActionType.StartRound;
  payload: { round: number };
} {
  return (
    action.type === ActionType.StartRound &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "round" in action.payload &&
    typeof action.payload.round === "number"
  );
}

export function isBuzzAction(action: Action): action is {
  type: ActionType.Buzz;
  payload: { userId: string; i: number; j: number; deltaMs: number };
} {
  return (
    action.type === ActionType.Buzz &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "deltaMs" in action.payload
  );
}

export function isAnswerAction(action: Action): action is {
  type: ActionType.Answer;
  payload: { userId: string; i: number; j: number; correct: boolean };
} {
  return (
    action.type === ActionType.Answer &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "correct" in action.payload
  );
}
