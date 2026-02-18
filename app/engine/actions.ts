import { z } from "zod";

import {
  coercePlayerColor,
  PLAYER_COLOR_HEX_REGEX,
  type PlayerColor,
} from "~/models/player-color";

import type { Action } from "./engine";
import { ActionType } from "./engine";
import type { State } from "./state";

const CluePayload = z.object({
  userId: z.string(),
  i: z.number(),
  j: z.number(),
});

const ClueWagerPayload = CluePayload.extend({ wager: z.number() });
export const PlayerPayload = z.object({
  userId: z.string(),
  name: z.string(),
  color: z
    .preprocess(
      (value) => coercePlayerColor(value),
      z.string().regex(PLAYER_COLOR_HEX_REGEX),
    )
    .optional(),
});
const RoundPayload = z.object({ round: z.number(), userId: z.string() });
const BuzzPayload = CluePayload.extend({ deltaMs: z.number() });
const AnswerPayload = CluePayload.extend({ answer: z.string() });
const CheckPayload = CluePayload.extend({ correct: z.boolean() });
const TransferPlayerPayload = z.object({
  oldUserId: z.string(),
  newUserId: z.string(),
});
const RestorePayload = z.object({
  type: z.string(),
  players: z.instanceof(Map),
  round: z.number(),
  game: z.record(z.string(), z.unknown()),
});

export function isClueAction(action: Action): action is {
  type: ActionType.ChooseClue | ActionType.NextClue;
  payload: { userId: string; i: number; j: number };
  ts: number;
} {
  return (
    (action.type === ActionType.ChooseClue ||
      action.type === ActionType.NextClue) &&
    CluePayload.safeParse(action.payload).success
  );
}

export function isClueWagerAction(action: Action): action is {
  type: ActionType.SetClueWager;
  payload: { userId: string; i: number; j: number; wager: number };
  ts: number;
} {
  return (
    action.type === ActionType.SetClueWager &&
    ClueWagerPayload.safeParse(action.payload).success
  );
}

export function isPlayerAction(action: Action): action is {
  type:
    | ActionType.Join
    | ActionType.ChangeName
    | ActionType.Kick
    | ActionType.Leave;
  payload: { userId: string; name: string; color?: PlayerColor };
  ts: number;
} {
  const parsed = PlayerPayload.safeParse(action.payload);
  if (!parsed.success) {
    return false;
  }
  action.payload = parsed.data;
  return (
    action.type === ActionType.Join ||
    action.type === ActionType.ChangeName ||
    action.type === ActionType.Kick ||
    action.type === ActionType.Leave
  );
}

export function isRoundAction(action: Action): action is {
  type: ActionType.StartRound;
  payload: { round: number; userId: string };
  ts: number;
} {
  return (
    action.type === ActionType.StartRound &&
    RoundPayload.safeParse(action.payload).success
  );
}

export function isBuzzAction(action: Action): action is {
  type: ActionType.Buzz;
  payload: { userId: string; i: number; j: number; deltaMs: number };
  ts: number;
} {
  return (
    action.type === ActionType.Buzz &&
    BuzzPayload.safeParse(action.payload).success
  );
}

export function isAnswerAction(action: Action): action is {
  type: ActionType.Answer;
  payload: { userId: string; i: number; j: number; answer: string };
  ts: number;
} {
  return (
    action.type === ActionType.Answer &&
    AnswerPayload.safeParse(action.payload).success
  );
}

export function isCheckAction(action: Action): action is {
  type: ActionType.Check;
  payload: { userId: string; i: number; j: number; correct: boolean };
  ts: number;
} {
  return (
    action.type === ActionType.Check &&
    CheckPayload.safeParse(action.payload).success
  );
}

export function isTransferPlayerAction(action: Action): action is {
  type: ActionType.TransferPlayer;
  payload: { oldUserId: string; newUserId: string };
  ts: number;
} {
  return (
    action.type === ActionType.TransferPlayer &&
    TransferPlayerPayload.safeParse(action.payload).success
  );
}

export function isRestoreAction(action: Action): action is {
  type: ActionType.Restore;
  payload: State;
  ts: number;
} {
  return (
    action.type === ActionType.Restore &&
    RestorePayload.safeParse(action.payload).success
  );
}
