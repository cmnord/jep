import type { Action } from "~/engine";
import { ActionType, CLUE_TIMEOUT_MS } from "~/engine";
import { MOCK_GAME } from "~/models/mock.server";

import { CluePhase, buildReplayFrames } from "./replay";

const PLAYER1 = { userId: "1", name: "Player 1" };
const PLAYER2 = { userId: "2", name: "Player 2" };

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

describe("buildReplayFrames", () => {
  it("records the resolved clue and the correct answerer", () => {
    const frames = buildReplayFrames(MOCK_GAME, withTs(PLAY_FIRST_CLUE));

    const resolved = frames.filter((f) => f.phase === CluePhase.Resolved);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].correctUserId).toBe(PLAYER2.userId);
    expect(resolved[0].state.players.get(PLAYER2.userId)?.score).toBe(200);
  });

  it("updates emitted frames when a check is corrected after resolution", () => {
    const frames = buildReplayFrames(
      MOCK_GAME,
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

    const resolved = frames.filter((f) => f.phase === CluePhase.Resolved);
    expect(resolved).toHaveLength(1);
    // The resolved frame reflects the corrected result, not the original.
    expect(resolved[0].correctUserId).toBeNull();
    expect(resolved[0].state.players.get(PLAYER2.userId)?.score).toBe(-200);

    const buzzed = frames.filter((f) => f.phase === CluePhase.Buzzed);
    expect(buzzed).toHaveLength(1);
    expect(buzzed[0].state.players.get(PLAYER2.userId)?.score).toBe(-200);

    // The pre-answer frame keeps its original snapshot.
    const chosen = frames.filter((f) => f.phase === CluePhase.Chosen);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].state.players.get(PLAYER2.userId)?.score).toBe(0);
  });

  it("ignores rejected corrections instead of corrupting earlier frames", () => {
    const frames = buildReplayFrames(
      MOCK_GAME,
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
        // the clue re-opens (unresolved: numAnswered unchanged).
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
        // closed. The reducer rejects it; the replay must too.
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

    const resolved = frames.filter(
      (f) => f.phase === CluePhase.Resolved && f.clue[1] === 0,
    );
    expect(resolved).toHaveLength(1);
    // The first clue's frame keeps its original score (+$200), untouched by
    // PLAYER2's later in-flight -$200 on the second clue.
    expect(resolved[0].state.players.get(PLAYER2.userId)?.score).toBe(200);
    expect(resolved[0].correctUserId).toBe(PLAYER2.userId);
  });

  it("does not leak later roster changes into corrected frames", () => {
    const latecomer = { userId: "3", name: "Latecomer" };
    const frames = buildReplayFrames(
      MOCK_GAME,
      withTs([
        ...PLAY_FIRST_CLUE,
        // A player joins after the clue resolved, before the correction.
        { type: ActionType.Join, payload: latecomer },
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

    const resolved = frames.filter((f) => f.phase === CluePhase.Resolved);
    expect(resolved).toHaveLength(1);
    // The correction is reflected...
    expect(resolved[0].state.players.get(PLAYER2.userId)?.score).toBe(-200);
    expect(resolved[0].correctUserId).toBeNull();
    // ...but the frame's roster stays historical: no late joiner.
    expect(resolved[0].state.players.has(latecomer.userId)).toBe(false);
  });
});
