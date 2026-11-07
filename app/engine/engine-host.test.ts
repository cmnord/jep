import { describe, expect, it } from "vitest";

import { GameSchema } from "~/models/convert.server";
import { MOCK_GAME } from "~/models/mock.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import choiceData from "~/static/mock-choice.jep.json";
import mediaData from "~/static/mock-media.jep.json";
import secretData from "~/static/mock-secret.jep.json";

import type { Action } from "./engine";
import {
  ActionType,
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  gameEngine,
  getStateTiebreakerSeed,
  getWinningBuzzer,
} from "./engine";
import { applyRoomEventsToState } from "./room-event";
import { GameState, isHostMode, type State, stateFromGame } from "./state";

/* The host role (feature 22): a non-player holds the host seat, sees the
 * answer and judges the players' spoken answers. Every event is inserted by
 * the server after the route's checks; the engine re-validates the seat
 * rules and who may judge. */

type TestAction = Omit<Action, "ts"> & { ts?: number };

const P1 = { userId: "1", name: "Player 1" };
const P2 = { userId: "2", name: "Player 2" };
const P3 = { userId: "3", name: "Player 3" };
const HOST = { userId: "h", name: "Host" };
const OTHER = { userId: "o", name: "Someone" };

const asGame = (data: unknown, id: string) => ({
  ...GameSchema.parse(data),
  id,
  visibility: "PUBLIC" as const,
});
const CHOICE_GAME = asGame(choiceData, "c");
const SECRET_GAME = asGame(secretData, "s");
const MEDIA_GAME = asGame(mediaData, "m");

const join = (p: { userId: string; name: string }): TestAction => ({
  type: ActionType.Join,
  payload: p,
});
const claim = (p: { userId: string; name: string } = HOST): TestAction => ({
  type: ActionType.ClaimHost,
  payload: p,
});
const release = (userId = HOST.userId, extra: object = {}): TestAction => ({
  type: ActionType.ReleaseHost,
  payload: { userId, ...extra },
});
const assign = (
  p: { userId: string; name: string },
  admin: unknown = true,
): TestAction => ({
  type: ActionType.AssignHost,
  payload: { ...p, admin },
});
const start = (userId = P1.userId, round = 0): TestAction => ({
  type: ActionType.StartRound,
  payload: { round, userId },
});
const choose = (i: number, j: number, userId = P1.userId): TestAction => ({
  type: ActionType.ChooseClue,
  payload: { userId, i, j },
});
const buzz = (userId: string, i: number, j: number, deltaMs: number) => ({
  type: ActionType.Buzz,
  payload: { userId, i, j, deltaMs },
});
const check = (
  userId: string,
  i: number,
  j: number,
  correct: boolean,
  extra: object = {},
): TestAction => ({
  type: ActionType.Check,
  payload: { userId, i, j, correct, ...extra },
});
/** The host judges `userId`'s answer (as the check route inserts it). */
const judge = (
  userId: string,
  i: number,
  j: number,
  correct: boolean,
  extra: object = {},
) => check(userId, i, j, correct, { host: true, ...extra });
const next = (userId: string, i: number, j: number): TestAction => ({
  type: ActionType.NextClue,
  payload: { userId, i, j },
});
const wager = (userId: string, i: number, j: number, amount: number) => ({
  type: ActionType.SetClueWager,
  payload: { userId, i, j, wager: amount },
});
const answer = (userId: string, i: number, j: number, text: string) => ({
  type: ActionType.Answer,
  payload: { userId, i, j, answer: text },
});
const pass = (userId: string, toUserId: string, i: number, j: number) => ({
  type: ActionType.PassClue,
  payload: { userId, i, j, toUserId },
});
const skip = (i: number, j: number): TestAction => ({
  type: ActionType.SkipClue,
  payload: { i, j, admin: true },
});
const adjust = (userId: string, delta: number): TestAction => ({
  type: ActionType.AdjustScore,
  payload: { userId, delta, admin: true },
});
const reveal = (payload: object): TestAction => ({
  type: ActionType.RevealAnswer,
  payload,
});
const asAdmin = (action: TestAction): TestAction => ({
  ...action,
  payload: Object.assign({}, action.payload, { admin: true }),
});
const asHost = (action: TestAction): TestAction => ({
  ...action,
  payload: Object.assign({}, action.payload, { host: true }),
});

function run(actions: TestAction[], state: State = stateFromGame(MOCK_GAME)) {
  return actions.reduce(
    (s, action, k) => gameEngine(s, { ts: k + 1, ...action }),
    state,
  );
}

const scores = (state: State) =>
  Object.fromEntries(
    [...state.players.values(), ...state.leftPlayers.values()].map((p) => [
      p.userId,
      p.score,
    ]),
  );

/** Two players and a host; the round is started by the host. */
const HOSTED_BOARD: TestAction[] = [
  join(P1),
  join(P2),
  claim(),
  start(HOST.userId),
];
/** MOCK_GAME round 1: (0, 0) and (0, 1) are $200 questions. */
const HOSTED_READING: TestAction[] = [...HOSTED_BOARD, choose(0, 0)];
/** P2 won the buzz on (0, 0) and answers out loud. */
const HOSTED_P2_ANSWERING: TestAction[] = [
  ...HOSTED_READING,
  buzz(P2.userId, 0, 0, 100),
  buzz(P1.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
];

describe("host seat", () => {
  interface Case {
    name: string;
    actions: TestAction[];
    host: { userId: string; name: string } | null;
    players?: string[];
  }
  const cases: Case[] = [
    {
      name: "a visitor claims the free seat in the lobby",
      actions: [join(P1), claim()],
      host: HOST,
      players: [P1.userId],
    },
    {
      name: "the seat can be claimed before anyone joined",
      actions: [claim()],
      host: HOST,
    },
    {
      name: "a player can't take the host seat",
      actions: [join(P1), claim({ userId: P1.userId, name: "P1" })],
      host: null,
    },
    {
      name: "a taken seat can't be claimed by someone else",
      actions: [join(P1), claim(), claim(OTHER)],
      host: HOST,
    },
    {
      name: "the host can't join as a player",
      actions: [join(P1), claim(), join(HOST)],
      host: HOST,
      players: [P1.userId],
    },
    {
      name: "the seat can't be claimed while a question is open",
      actions: [join(P1), join(P2), start(), choose(0, 0), claim()],
      host: null,
    },
    {
      name: "a free seat can be claimed mid-game between questions",
      actions: [
        join(P1),
        join(P2),
        start(),
        choose(0, 0),
        skip(0, 0),
        next(P1.userId, 0, 0),
        claim(),
      ],
      host: HOST,
    },
    {
      name: "the host frees the seat between questions",
      actions: [...HOSTED_BOARD, release()],
      host: null,
    },
    {
      name: "someone else can't free the seat",
      actions: [...HOSTED_BOARD, release(P1.userId)],
      host: HOST,
    },
    {
      name: "the admin may free the seat",
      actions: [...HOSTED_BOARD, release(P1.userId, { admin: true })],
      host: null,
    },
    {
      name: "the seat isn't freed while a question is open",
      actions: [...HOSTED_READING, release()],
      host: HOST,
    },
    {
      name: "the admin gives the free seat to a watcher",
      actions: [join(P1), assign(OTHER)],
      host: OTHER,
    },
    {
      name: "the admin replaces the host, even during a question",
      actions: [...HOSTED_P2_ANSWERING, assign(OTHER)],
      host: OTHER,
    },
    {
      name: "assign without the admin flag is ignored",
      actions: [join(P1), claim(), assign(OTHER, false)],
      host: HOST,
    },
    {
      name: "the admin can't make a player the host",
      actions: [join(P1), assign({ userId: P1.userId, name: "P1" })],
      host: null,
    },
    {
      name: "the admin can't fill an empty seat during a question",
      actions: [join(P1), join(P2), start(), choose(0, 0), assign(OTHER)],
      host: null,
    },
    {
      name: "nothing changes after game over",
      actions: [
        join(P1),
        start(),
        skip(0, 0),
        skip(0, 1),
        start(P1.userId, 1),
        skip(0, 0),
        skip(0, 1),
        claim(),
      ],
      host: null,
    },
  ];
  it.each(cases)("$name", ({ actions, host, players }) => {
    const state = run(actions);
    expect(state.host).toEqual(host);
    if (players) {
      expect(Array.from(state.players.keys())).toEqual(players);
    }
  });

  it("keeps an avatar and is not a player", () => {
    const state = run([
      join(P1),
      { type: ActionType.ClaimHost, payload: { ...HOST, avatar: "emoji:🎤" } },
    ]);
    expect(state.host).toEqual({ ...HOST, avatar: "emoji:🎤" });
    expect(state.players.has(HOST.userId)).toBe(false);
    expect(isHostMode(state)).toBe(true);
  });

  it("ignores malformed seat events without throwing", () => {
    const state = run([
      join(P1),
      { type: ActionType.ClaimHost, payload: { name: "x" } },
      { type: ActionType.AssignHost, payload: 42 },
      { type: ActionType.ReleaseHost },
    ]);
    expect(state.host).toBeNull();
  });
});

describe("host mode: flow control", () => {
  it("only the host (or the admin) starts the round", () => {
    const base = [join(P1), join(P2), claim()];
    expect(run([...base, start(P1.userId)]).type).toBe(GameState.PreviewRound);
    expect(run([...base, start(HOST.userId)]).type).toBe(GameState.ShowBoard);
    expect(run([...base, asAdmin(start(P1.userId))]).type).toBe(
      GameState.ShowBoard,
    );
    expect(run([...base, asHost(start(P1.userId))]).type).toBe(
      GameState.ShowBoard,
    );
  });

  it("the board-control player or the host chooses", () => {
    expect(run([...HOSTED_BOARD, choose(0, 0, P1.userId)]).type).toBe(
      GameState.ReadClue,
    );
    expect(run([...HOSTED_BOARD, choose(0, 0, HOST.userId)]).type).toBe(
      GameState.ReadClue,
    );
    expect(run([...HOSTED_BOARD, choose(0, 0, P2.userId)]).type).toBe(
      GameState.ShowBoard,
    );
  });

  it("only the host goes back to the board", () => {
    const answered = [...HOSTED_P2_ANSWERING, judge(P2.userId, 0, 0, true)];
    // P2 has board control now, but in host mode the host advances.
    expect(run([...answered, next(P2.userId, 0, 0)]).type).toBe(
      GameState.RevealAnswerToAll,
    );
    expect(run([...answered, next(HOST.userId, 0, 0)]).type).toBe(
      GameState.ShowBoard,
    );
    expect(run([...answered, asAdmin(next(P2.userId, 0, 0))]).type).toBe(
      GameState.ShowBoard,
    );
  });

  it("host-tagged actions are ignored without a host", () => {
    const state = run([join(P1), join(P2), asHost(start(P1.userId))]);
    // The board-control player could start, but not with a host tag.
    expect(state.type).toBe(GameState.PreviewRound);
  });
});

describe("host mode: judging", () => {
  interface Case {
    name: string;
    game?: typeof MOCK_GAME;
    actions: TestAction[];
    type: GameState;
    scores: Record<string, number>;
    boardControl?: string | null;
    /** Players locked out of the open question. */
    lockedOut?: string[];
  }
  const cases: Case[] = [
    {
      name: "a player's own check is ignored",
      actions: [...HOSTED_P2_ANSWERING, check(P2.userId, 0, 0, true)],
      type: GameState.RevealAnswerToBuzzer,
      scores: { 1: 0, 2: 0 },
    },
    {
      name: "Right: +value, board control, answer to everyone",
      actions: [...HOSTED_P2_ANSWERING, judge(P2.userId, 0, 0, true)],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 0, 2: 200 },
      boardControl: P2.userId,
    },
    {
      name: "Wrong: −value, buzzers reopen for the others",
      actions: [...HOSTED_P2_ANSWERING, judge(P2.userId, 0, 0, false)],
      type: GameState.ReadClue,
      scores: { 1: 0, 2: -200 },
      boardControl: P1.userId,
      lockedOut: [P2.userId],
    },
    {
      name: "Wrong, then the other player buzzes and is right",
      actions: [
        ...HOSTED_P2_ANSWERING,
        judge(P2.userId, 0, 0, false),
        buzz(P1.userId, 0, 0, 300),
        judge(P1.userId, 0, 0, true),
      ],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 200, 2: -200 },
      boardControl: P1.userId,
    },
    {
      name: "everyone wrong: the answer is shown to everyone",
      actions: [
        ...HOSTED_P2_ANSWERING,
        judge(P2.userId, 0, 0, false),
        buzz(P1.userId, 0, 0, 300),
        judge(P1.userId, 0, 0, false),
      ],
      type: GameState.RevealAnswerToAll,
      scores: { 1: -200, 2: -200 },
      boardControl: P1.userId,
    },
    {
      name: "the host can't judge someone who isn't answering",
      actions: [...HOSTED_P2_ANSWERING, judge(P1.userId, 0, 0, true)],
      type: GameState.RevealAnswerToBuzzer,
      scores: { 1: 0, 2: 0 },
    },
    {
      name: "the admin may judge too",
      actions: [...HOSTED_P2_ANSWERING, asAdmin(check(P2.userId, 0, 0, true))],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 0, 2: 200 },
    },
    {
      name: "a host-tagged check without a host is ignored (self-marking)",
      actions: [
        join(P1),
        join(P2),
        start(),
        choose(0, 0),
        buzz(P2.userId, 0, 0, 100),
        buzz(P1.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
        judge(P2.userId, 0, 0, true),
      ],
      type: GameState.RevealAnswerToBuzzer,
      scores: { 1: 0, 2: 0 },
    },
    {
      name: "answer timer: the host's device marks the timeout wrong",
      actions: [
        join(P1),
        join(P2),
        claim(),
        {
          type: ActionType.SetSettings,
          payload: {
            userId: HOST.userId,
            answerTimeSec: 10,
            autoWrongOnTimeout: true,
            host: true,
          },
        },
        start(HOST.userId),
        choose(0, 0),
        buzz(P2.userId, 0, 0, 100),
        buzz(P1.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
        judge(P2.userId, 0, 0, false, { timedOut: true }),
        // Sent twice (two tabs): the second one is ignored.
        judge(P2.userId, 0, 0, false, { timedOut: true }),
      ],
      type: GameState.ReadClue,
      scores: { 1: 0, 2: -200 },
      lockedOut: [P2.userId],
    },
    {
      name: "answer timer: the player's own timed-out check is ignored",
      actions: [
        ...HOSTED_P2_ANSWERING,
        check(P2.userId, 0, 0, false, { timedOut: true }),
      ],
      type: GameState.RevealAnswerToBuzzer,
      scores: { 1: 0, 2: 0 },
    },
    {
      name: "after the host leaves, players mark themselves again",
      actions: [
        ...HOSTED_P2_ANSWERING,
        judge(P2.userId, 0, 0, true),
        next(HOST.userId, 0, 0),
        release(),
        choose(0, 1, P2.userId),
        buzz(P1.userId, 0, 1, 100),
        buzz(P2.userId, 0, 1, CLUE_TIMEOUT_MS + 1),
        check(P1.userId, 0, 1, true),
      ],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 200, 2: 200 },
      boardControl: P1.userId,
    },
    {
      name: "cat in the bag: the receiver answers, the host judges",
      game: SECRET_GAME,
      actions: [
        ...HOSTED_BOARD,
        // (1, 0) is the cat in the bag worth $500.
        choose(1, 0),
        pass(P1.userId, P2.userId, 1, 0),
        check(P2.userId, 1, 0, true),
        judge(P2.userId, 1, 0, false),
      ],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 0, 2: -500 },
      boardControl: P1.userId,
    },
    {
      name: "Double Down: the host judges the wagered answer",
      actions: [
        join(P1),
        join(P2),
        claim(),
        start(HOST.userId),
        skip(0, 0),
        skip(0, 1),
        adjust(P2.userId, 1000),
        // P1 has the lowest score, so board control in round 2.
        start(HOST.userId, 1),
        // The host picks the Double Down for P1.
        choose(0, 0, HOST.userId),
        wager(P1.userId, 0, 0, 300),
        buzz(P1.userId, 0, 0, 100),
        judge(P1.userId, 0, 0, true),
      ],
      type: GameState.RevealAnswerToAll,
      scores: { 1: 300, 2: 1000 },
      boardControl: P1.userId,
    },
  ];
  it.each(cases)("$name", (c) => {
    const state = run(c.actions, stateFromGame(c.game ?? MOCK_GAME));
    expect(state.type).toBe(c.type);
    expect(scores(state)).toEqual(c.scores);
    if (c.boardControl !== undefined) {
      expect(state.boardControl).toBe(c.boardControl);
    }
    if (c.lockedOut) {
      expect(
        Array.from(state.buzzes.entries())
          .filter(([, b]) => b === CANT_BUZZ_FLAG)
          .map(([id]) => id),
      ).toEqual(c.lockedOut);
    }
  });

  it("records a timeout run out by the host's device", () => {
    const state = run(
      [
        join(P1),
        join(P2),
        claim(),
        {
          type: ActionType.SetSettings,
          payload: {
            userId: HOST.userId,
            answerTimeSec: 10,
            autoWrongOnTimeout: true,
            admin: true,
          },
        },
        start(HOST.userId),
        choose(0, 0),
        buzz(P2.userId, 0, 0, 100),
        buzz(P1.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
        judge(P2.userId, 0, 0, false, { timedOut: true }),
      ],
      stateFromGame(MOCK_GAME),
    );
    expect(state.answerTimedOut).toEqual({ userId: P2.userId, startedAt: 8 });
  });

  it("Undo of a check is the host's (or the admin's) in host mode", () => {
    const answered = [...HOSTED_P2_ANSWERING, judge(P2.userId, 0, 0, false)];
    const undo = (extra: object = {}): TestAction => ({
      type: ActionType.CorrectCheck,
      payload: {
        round: 0,
        i: 0,
        j: 0,
        userId: P2.userId,
        correct: true,
        ...extra,
      },
    });
    const afterReveal = [
      ...answered,
      buzz(P1.userId, 0, 0, 300),
      judge(P1.userId, 0, 0, false),
    ];
    expect(scores(run([...afterReveal, undo()]))).toEqual({ 1: -200, 2: -200 });
    // P2 was right after all: P1's later answer no longer counts.
    expect(scores(run([...afterReveal, undo({ host: true })]))).toEqual({
      1: 0,
      2: 200,
    });
  });
});

describe("host mode: multiple choice", () => {
  const PICKING: TestAction[] = [
    join(P1),
    join(P2),
    claim(),
    start(HOST.userId),
    choose(0, 0),
    buzz(P1.userId, 0, 0, 100),
    buzz(P2.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
  ];
  const pick = (userId: string, choice: number, correct: boolean) =>
    check(userId, 0, 0, correct, { choice });

  it("the player picks; the server's verdict is trusted", () => {
    // Players' clients have no answer: the payload decides. (The check
    // route always computes it from the game data.)
    const state = run(
      [...PICKING, pick(P1.userId, 1, true)],
      stateFromGame(CHOICE_GAME),
    );
    expect(state.type).toBe(GameState.RevealAnswerToAll);
    expect(scores(state)).toEqual({ 1: 200, 2: 0 });
    expect(state.choicePicks.get("0,0,0")).toEqual(new Map([[P1.userId, 1]]));
  });

  it("is judged the same without the answer in the game data", () => {
    const hidden = {
      ...CHOICE_GAME,
      boards: CHOICE_GAME.boards.map((b) => ({
        ...b,
        categories: b.categories.map((c) => ({
          ...c,
          clues: c.clues.map((clue) => ({ ...clue, answer: "" })),
        })),
      })),
    };
    const actions = [...PICKING, pick(P1.userId, 0, false)];
    const full = run(actions, stateFromGame(CHOICE_GAME));
    const stripped = run(actions, stateFromGame(hidden));
    expect(full.type).toBe(GameState.ReadClue);
    expect(stripped.type).toBe(full.type);
    expect(scores(stripped)).toEqual(scores(full));
  });

  it("self-marking rooms still re-check the pick against the answer", () => {
    const state = run(
      [
        join(P1),
        join(P2),
        start(),
        choose(0, 0),
        buzz(P1.userId, 0, 0, 100),
        buzz(P2.userId, 0, 0, CLUE_TIMEOUT_MS + 1),
        pick(P1.userId, 0, true),
      ],
      stateFromGame(CHOICE_GAME),
    );
    expect(scores(state)).toEqual({ 1: -200, 2: 0 });
  });

  it("a timeout without a pick needs the host", () => {
    const settings: TestAction = {
      type: ActionType.SetSettings,
      payload: {
        userId: HOST.userId,
        answerTimeSec: 10,
        autoWrongOnTimeout: true,
        host: true,
      },
    };
    const base = [join(P1), join(P2), claim(), settings, ...PICKING.slice(3)];
    const timedOut = { timedOut: true };
    expect(
      run(
        [...base, check(P1.userId, 0, 0, false, timedOut)],
        stateFromGame(CHOICE_GAME),
      ).type,
    ).toBe(GameState.RevealAnswerToBuzzer);
    expect(
      scores(
        run(
          [...base, judge(P1.userId, 0, 0, false, timedOut)],
          stateFromGame(CHOICE_GAME),
        ),
      ),
    ).toEqual({ 1: -200, 2: 0 });
  });
});

describe("host mode: the Final", () => {
  /** Both players have $1000 and wagered on the Final (round 2, (0, 1)). */
  const FINAL_ANSWERED: TestAction[] = [
    join(P1),
    join(P2),
    claim(),
    start(HOST.userId),
    skip(0, 0),
    skip(0, 1),
    adjust(P1.userId, 1000),
    adjust(P2.userId, 1000),
    start(HOST.userId, 1),
    skip(0, 0),
    choose(0, 1, HOST.userId),
    wager(P1.userId, 0, 1, 300),
    wager(P2.userId, 0, 1, 500),
    answer(P1.userId, 0, 1, "h"),
    answer(P2.userId, 0, 1, "nope"),
  ];

  it("the host judges each typed answer; players can't mark their own", () => {
    let state = run(FINAL_ANSWERED);
    expect(state.type).toBe(GameState.RevealAnswerLongForm);
    state = run([...FINAL_ANSWERED, check(P1.userId, 0, 1, true)]);
    expect(state.isAnswered[1][0][1].answeredBy.size).toBe(0);

    state = run([...FINAL_ANSWERED, judge(P1.userId, 0, 1, true)]);
    expect(state.type).toBe(GameState.RevealAnswerLongForm);
    state = run([
      ...FINAL_ANSWERED,
      judge(P1.userId, 0, 1, true),
      judge(P2.userId, 0, 1, false),
    ]);
    expect(state.type).toBe(GameState.RevealAnswerToAll);
    expect(scores(state)).toEqual({ 1: 1300, 2: 500 });
  });

  it("the host shows the answer of a Final nobody could wager on", () => {
    const base = [
      join(P1),
      join(P2),
      claim(),
      start(HOST.userId),
      skip(0, 0),
      skip(0, 1),
      start(HOST.userId, 1),
      skip(0, 0),
      choose(0, 1, HOST.userId),
    ];
    expect(run(base).type).toBe(GameState.ReadLongFormClue);
    expect(run([...base, next(P1.userId, 0, 1)]).type).toBe(
      GameState.ReadLongFormClue,
    );
    expect(run([...base, next(HOST.userId, 0, 1)]).type).toBe(
      GameState.RevealAnswerToAll,
    );
  });
});

describe("reveal_answer", () => {
  it("stores the revealed answer of a question", () => {
    const state = run([
      ...HOSTED_P2_ANSWERING,
      judge(P2.userId, 0, 0, true),
      reveal({ round: 0, i: 0, j: 0, answer: "b" }),
      reveal({
        round: 0,
        i: 0,
        j: 1,
        answer: "d",
        answerMedia: [{ type: "image", src: "https://x/y.png" }],
      }),
    ]);
    expect(state.revealed.get("0,0,0")).toEqual({ answer: "b" });
    expect(state.revealed.get("0,0,1")).toEqual({
      answer: "d",
      answerMedia: [{ type: "image", src: "https://x/y.png" }],
    });
  });

  it("ignores malformed reveals without throwing", () => {
    const state = run([
      join(P1),
      reveal({ round: 0, i: 0 }),
      reveal({ round: "x", i: 0, j: 0, answer: "b" }),
      { type: ActionType.RevealAnswer },
    ]);
    expect(state.revealed.size).toBe(0);
  });
});

describe("tiebreak seed", () => {
  it("is the same with or without the answer in host mode", () => {
    // (2, 0) of the media game has no text: the answer used to be the seed.
    const hidden = {
      ...MEDIA_GAME,
      boards: MEDIA_GAME.boards.map((b) => ({
        ...b,
        categories: b.categories.map((c) => ({
          ...c,
          clues: c.clues.map((clue) => ({ ...clue, answer: "" })),
        })),
      })),
    };
    const actions = [
      join(P1),
      join(P2),
      join(P3),
      claim(),
      start(HOST.userId),
      choose(2, 0, HOST.userId),
    ];
    const full = run(actions, stateFromGame(MEDIA_GAME));
    const stripped = run(actions, stateFromGame(hidden));
    expect(getStateTiebreakerSeed(full)).toBe(getStateTiebreakerSeed(stripped));
    // A three-way tie is decided the same way on every client.
    const buzzes = new Map([
      ["1", 100],
      ["2", 100],
      ["3", 100],
    ]);
    expect(getWinningBuzzer(buzzes, getStateTiebreakerSeed(full))).toEqual(
      getWinningBuzzer(buzzes, getStateTiebreakerSeed(stripped)),
    );
  });

  it("is unchanged in self-marking rooms", () => {
    const state = run(
      [join(P1), start(), choose(2, 0)],
      stateFromGame(MEDIA_GAME),
    );
    const clue = MEDIA_GAME.boards[0].categories[0].clues[2];
    expect(getStateTiebreakerSeed(state)).toBe(clue.answer);
  });
});

describe("replay", () => {
  it("rooms without a host replay exactly as before", () => {
    const payloads: [ActionType, object][] = [
      [ActionType.Join, P1],
      [ActionType.Join, P2],
      [ActionType.StartRound, { round: 0, userId: P1.userId }],
      [ActionType.ChooseClue, { userId: P1.userId, i: 0, j: 0 }],
      [ActionType.Buzz, { userId: P2.userId, i: 0, j: 0, deltaMs: 100 }],
      [
        ActionType.Buzz,
        { userId: P1.userId, i: 0, j: 0, deltaMs: CLUE_TIMEOUT_MS + 1 },
      ],
      [ActionType.Check, { userId: P2.userId, i: 0, j: 0, correct: true }],
      [ActionType.NextClue, { userId: P2.userId, i: 0, j: 0 }],
    ];
    const events: DbRoomEvent[] = payloads.map(([type, payload], k) => ({
      id: k + 1,
      room_id: 1,
      ts: `2026-11-01T10:00:0${k}`,
      type,
      payload: JSON.parse(JSON.stringify(payload)),
    }));
    const state = applyRoomEventsToState(stateFromGame(MOCK_GAME), events);
    expect(state.host).toBeNull();
    expect(state.revealed.size).toBe(0);
    expect(state.type).toBe(GameState.ShowBoard);
    expect(scores(state)).toEqual({ 1: 0, 2: 200 });
    expect(state.boardControl).toBe(P2.userId);
  });
});
