import { describe, expect, it } from "vitest";

import { ActionType, gameEngine } from "~/engine";
import type { Action } from "~/engine";
import { stateFromGame } from "~/engine/state";
import { GameSchema } from "~/models/convert.server";
import { MOCK_GAME } from "~/models/mock.server";
import choiceData from "~/static/mock-choice.jep.json";

import {
  getAnswerToReveal,
  shouldWithholdAnswers,
  withholdAnswers,
} from "./withhold-answers";

const CHOICE_GAME = {
  ...GameSchema.parse(choiceData),
  id: "c",
  visibility: "PUBLIC" as const,
};

const P1 = { userId: "1", name: "P1" };
const P2 = { userId: "2", name: "P2" };
const HOST = { userId: "h", name: "Host" };

function run(actions: Omit<Action, "ts">[], game = MOCK_GAME) {
  return actions.reduce(
    (s, a, k) => gameEngine(s, { ...a, ts: k + 1 }),
    stateFromGame(game),
  );
}

const HOSTED = [
  { type: ActionType.Join, payload: P1 },
  { type: ActionType.Join, payload: P2 },
  { type: ActionType.ClaimHost, payload: HOST },
  { type: ActionType.StartRound, payload: { round: 0, userId: HOST.userId } },
];
const choose = (i: number, j: number) => ({
  type: ActionType.ChooseClue,
  payload: { userId: P1.userId, i, j },
});
const buzz = (userId: string, deltaMs: number) => ({
  type: ActionType.Buzz,
  payload: { userId, i: 0, j: 0, deltaMs },
});

describe("shouldWithholdAnswers", () => {
  it("hides answers from everyone but the host and the admin", () => {
    const state = run(HOSTED);
    expect(shouldWithholdAnswers(state, P1.userId, false)).toBe(true);
    expect(shouldWithholdAnswers(state, "visitor", false)).toBe(true);
    expect(shouldWithholdAnswers(state, null, false)).toBe(true);
    expect(shouldWithholdAnswers(state, HOST.userId, false)).toBe(false);
    expect(shouldWithholdAnswers(state, P1.userId, true)).toBe(false);
  });

  it("hides nothing without a host", () => {
    const state = run(HOSTED.filter((a) => a.type !== ActionType.ClaimHost));
    expect(shouldWithholdAnswers(state, P1.userId, false)).toBe(false);
  });
});

describe("withholdAnswers", () => {
  it("drops answers and answer media of unresolved questions only", () => {
    const state = run([
      ...HOSTED,
      choose(0, 0),
      buzz(P1.userId, 100),
      buzz(P2.userId, 9999),
      {
        type: ActionType.Check,
        payload: { userId: P1.userId, i: 0, j: 0, correct: true, host: true },
      },
    ]);
    const game = {
      ...MOCK_GAME,
      boards: MOCK_GAME.boards.map((b) => ({
        ...b,
        categories: b.categories.map((c) => ({
          ...c,
          clues: c.clues.map((clue) => ({
            ...clue,
            answerMedia: [{ type: "image" as const, src: "https://x/a.png" }],
          })),
        })),
      })),
    };
    const hidden = withholdAnswers(game, state);
    const resolved = hidden.boards[0].categories[0].clues[0];
    const open = hidden.boards[0].categories[1].clues[0];
    expect(resolved.answer).toBe("b");
    expect(resolved.answerMedia).toHaveLength(1);
    expect(open.answer).toBe("");
    expect("answerMedia" in open).toBe(false);
    expect(hidden.boards[1].categories[0].clues[0].answer).toBe("");
    // The questions themselves are untouched.
    expect(open.clue).toBe("c");
    // Nothing in the serialized page names a withheld answer.
    const json = JSON.stringify(hidden);
    for (const answer of ["d", "f", "h"]) {
      expect(json).not.toContain(`"answer":"${answer}"`);
    }
    // The original game is not modified.
    expect(game.boards[0].categories[1].clues[0].answer).toBe("d");
  });

  it("keeps the options of a multiple choice question but not the answer", () => {
    const state = run(HOSTED, CHOICE_GAME);
    const hidden = withholdAnswers(CHOICE_GAME, state);
    const clue = hidden.boards[0].categories[0].clues[0];
    expect(clue.choices).toEqual(["Sydney", "Canberra", "Melbourne", "Perth"]);
    expect(clue.answer).toBe("");
  });

  it("keeps answers revealed by the server", () => {
    const state = run([
      ...HOSTED,
      {
        type: ActionType.RevealAnswer,
        payload: { round: 0, i: 0, j: 1, answer: "d" },
      },
    ]);
    expect(
      withholdAnswers(MOCK_GAME, state).boards[0].categories[1].clues[0].answer,
    ).toBe("d");
  });
});

describe("getAnswerToReveal", () => {
  const RIGHT = {
    type: ActionType.Check,
    payload: { userId: P1.userId, i: 0, j: 0, correct: true, host: true },
  };

  it("names the answer of a question just resolved in host mode", () => {
    const state = run([
      ...HOSTED,
      choose(0, 0),
      buzz(P1.userId, 100),
      buzz(P2.userId, 9999),
      RIGHT,
    ]);
    expect(getAnswerToReveal(state)).toEqual({
      round: 0,
      i: 0,
      j: 0,
      answer: "b",
    });
  });

  it("is null while the question is open, once revealed, or without a host", () => {
    expect(
      getAnswerToReveal(
        run([
          ...HOSTED,
          choose(0, 0),
          buzz(P1.userId, 100),
          buzz(P2.userId, 9999),
        ]),
      ),
    ).toBeNull();
    expect(
      getAnswerToReveal(
        run([
          ...HOSTED,
          choose(0, 0),
          buzz(P1.userId, 100),
          buzz(P2.userId, 9999),
          RIGHT,
          {
            type: ActionType.RevealAnswer,
            payload: { round: 0, i: 0, j: 0, answer: "b" },
          },
        ]),
      ),
    ).toBeNull();
    expect(
      getAnswerToReveal(
        run([
          { type: ActionType.Join, payload: P1 },
          { type: ActionType.StartRound, payload: { round: 0, userId: "1" } },
          choose(0, 0),
          buzz(P1.userId, 100),
          {
            type: ActionType.Check,
            payload: { userId: P1.userId, i: 0, j: 0, correct: true },
          },
        ]),
      ),
    ).toBeNull();
  });

  it("reveals when everyone passed on the buzzer", () => {
    const state = run([
      ...HOSTED,
      choose(0, 0),
      buzz(P1.userId, 9999),
      buzz(P2.userId, 9999),
    ]);
    expect(getAnswerToReveal(state)?.answer).toBe("b");
  });
});
