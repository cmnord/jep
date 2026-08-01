import type { Action } from "~/engine";
import { ActionType, CLUE_TIMEOUT_MS } from "~/engine";
import type { Player } from "~/engine/state";
import { MOCK_GAME } from "~/models/mock.server";

import { buildChartData } from "./chart";

const PLAYER1: Player = { userId: "1", name: "Player 1", score: 0 };
const PLAYER2: Player = { userId: "2", name: "Player 2", score: 0 };

/** Play the first $200 clue: PLAYER2 buzzes and self-checks correct. */
const PLAY_FIRST_CLUE: Omit<Action, "ts">[] = [
  { type: ActionType.Join, payload: PLAYER1 },
  { type: ActionType.Join, payload: PLAYER2 },
  {
    type: ActionType.StartRound,
    payload: { round: 0, userId: PLAYER1.userId },
  },
  {
    type: ActionType.ChooseClue,
    payload: { userId: PLAYER1.userId, i: 0, j: 0 },
  },
  {
    type: ActionType.Buzz,
    payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
  },
  {
    type: ActionType.Buzz,
    payload: {
      userId: PLAYER1.userId,
      i: 0,
      j: 0,
      deltaMs: CLUE_TIMEOUT_MS + 1,
    },
  },
  {
    type: ActionType.Check,
    payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
  },
];

function withTs(actions: Omit<Action, "ts">[]): Action[] {
  return actions.map((a) => ({ ts: 0, ...a }) as Action);
}

describe("buildChartData", () => {
  it("updates the recorded point when a check is corrected", () => {
    const data = buildChartData(
      MOCK_GAME,
      [PLAYER1, PLAYER2],
      withTs([
        ...PLAY_FIRST_CLUE,
        {
          type: ActionType.CorrectCheck,
          payload: {
            round: 0,
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            correct: false,
          },
        },
      ]),
    );

    expect(data).toHaveLength(2);
    expect(data[1][PLAYER2.userId]).toBe(-200);
  });

  it("ignores rejected corrections instead of corrupting earlier points", () => {
    const data = buildChartData(
      MOCK_GAME,
      [PLAYER1, PLAYER2],
      withTs([
        ...PLAY_FIRST_CLUE,
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        // The next clue is chosen, closing the correction window...
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        // ...and PLAYER2 answers it incorrectly, changing their score while
        // the clue re-opens (unresolved: no new chart point yet).
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: false },
        },
        // A stale correction for the first clue arrives after its window
        // closed. The reducer rejects it; the chart must too.
        {
          type: ActionType.CorrectCheck,
          payload: {
            round: 0,
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            correct: false,
          },
        },
      ]),
    );

    // Only the first clue has resolved, so there is one recorded point —
    // and it keeps the original +$200, not PLAYER2's in-flight $0.
    expect(data).toHaveLength(2);
    expect(data[1][PLAYER2.userId]).toBe(200);
  });
});
