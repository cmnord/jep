import { produce } from "immer";

import { MOCK_GAME } from "~/models/mock.server";

import type { Action } from "./engine";
import {
  ActionType,
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  gameEngine,
  getWinningBuzzer,
} from "./engine";
import type { Player } from "./state";
import { GameState, State, stateFromGame } from "./state";

const PLAYER1: Player = {
  name: "Player 1",
  userId: "1",
  score: 0,
};

const PLAYER2: Player = {
  name: "Player 2",
  userId: "2",
  score: 0,
};

const PLAYER1_JOIN_ACTION: Action = {
  type: ActionType.Join,
  payload: { name: PLAYER1.name, userId: PLAYER1.userId },
};

const PLAYER2_JOIN_ACTION: Action = {
  type: ActionType.Join,
  payload: { name: PLAYER2.name, userId: PLAYER2.userId },
};

const TWO_PLAYERS_ROUND_0: Action[] = [
  PLAYER1_JOIN_ACTION,
  PLAYER2_JOIN_ACTION,
  {
    type: ActionType.StartRound,
    payload: { round: 0, userId: PLAYER1.userId },
  },
];

const TWO_PLAYERS_ROUND_1: Action[] = [
  ...TWO_PLAYERS_ROUND_0,
  {
    type: ActionType.ChooseClue,
    payload: { userId: PLAYER1.userId, i: 0, j: 0 },
  },
  {
    type: ActionType.Buzz,
    payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
  },
  {
    type: ActionType.Buzz,
    payload: {
      userId: PLAYER2.userId,
      i: 0,
      j: 0,
      deltaMs: CLUE_TIMEOUT_MS + 1,
    },
  },
  {
    type: ActionType.Check,
    payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: true },
  },
  {
    type: ActionType.NextClue,
    payload: { userId: PLAYER1.userId, i: 0, j: 0 },
  },
  {
    type: ActionType.ChooseClue,
    payload: { userId: PLAYER1.userId, i: 0, j: 1 },
  },
  {
    type: ActionType.Buzz,
    payload: { userId: PLAYER1.userId, i: 0, j: 1, deltaMs: 123 },
  },
  {
    type: ActionType.Buzz,
    payload: {
      userId: PLAYER2.userId,
      i: 0,
      j: 1,
      deltaMs: CLUE_TIMEOUT_MS + 1,
    },
  },
  {
    type: ActionType.Check,
    payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: true },
  },
  {
    type: ActionType.NextClue,
    payload: { userId: PLAYER1.userId, i: 0, j: 1 },
  },
];

describe("gameEngine", () => {
  interface TestCase {
    name: string;
    state: State;
    actions: Action[];
    expectedState: State;
  }

  const initialState = stateFromGame(MOCK_GAME);

  const testCases: TestCase[] = [
    {
      name: "Player joins",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION],
      expectedState: produce(initialState, (draft) => {
        draft.boardControl = PLAYER1.userId;
        draft.players.set(PLAYER1.userId, PLAYER1);
      }),
    },
    {
      name: "Player joins, chooses name",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.ChangeName,
          payload: { name: "Player New Name", userId: PLAYER1.userId },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.boardControl = PLAYER1.userId;
        draft.players.set(PLAYER1.userId, {
          ...PLAYER1,
          name: "Player New Name",
        });
      }),
    },
    {
      name: "Two players join, first gets board control",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION, PLAYER2_JOIN_ACTION],
      expectedState: produce(initialState, (draft) => {
        draft.boardControl = PLAYER1.userId;
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "Round start",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0, userId: PLAYER1.userId },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ShowBoard;
        draft.boardControl = PLAYER1.userId;
        draft.players.set(PLAYER1.userId, PLAYER1);
      }),
    },
    {
      name: "Choose clue",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0, userId: PLAYER1.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadClue;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.players.set(PLAYER1.userId, PLAYER1);
      }),
    },
    {
      name: "If the only player in the game buzzes in for clue, show them the answer",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
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
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);
        draft.players.set(PLAYER1.userId, PLAYER1);
      }),
    },
    {
      name: "If one of multiple players in the game buzzes in for clue, wait for more buzzes",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadClue;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "If all players buzz in, reveal answer to winner",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 456 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);
        draft.buzzes.set(PLAYER2.userId, 456);
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "If one player buzzes in and the rest time out, reveal answer to buzzer",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);
        draft.buzzes.set(PLAYER2.userId, CLUE_TIMEOUT_MS + 1);
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "If one player buzzes in and then times out without a response from the other player, still wait",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
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
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadClue;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "Accept later buzzes even if one player times out",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
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
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: 123,
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, CLUE_TIMEOUT_MS + 1);
        draft.buzzes.set(PLAYER2.userId, 123);
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "If single player is incorrect, reveal to all",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
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
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, 123);

        const clueState = draft.isAnswered[0][0][0];
        clueState.isAnswered = true;
        clueState.answeredBy.set(PLAYER1.userId, false);

        draft.numAnswered = 1;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: -200 });
      }),
    },
    {
      name: "If one of multiple players answers incorrectly, re-open buzzers with prev buzzer locked out",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadClue;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;
        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);

        draft.isAnswered[0][0][0].answeredBy.set(PLAYER1.userId, false);

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: -200 });
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "Second player can buzz after first is locked out",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER1.userId;

        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);
        draft.buzzes.set(PLAYER2.userId, 123);

        draft.isAnswered[0][0][0].answeredBy.set(PLAYER1.userId, false);

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: -200 });
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "Second player correct, first is locked out",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 0];

        const clueAnswer = draft.isAnswered[0][0][0];
        clueAnswer.isAnswered = true;
        clueAnswer.answeredBy.set(PLAYER1.userId, false);
        clueAnswer.answeredBy.set(PLAYER2.userId, true);

        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);
        draft.buzzes.set(PLAYER2.userId, 123);
        draft.numAnswered = 1;

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: -200 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 200 });
      }),
    },
    {
      name: "Dismiss clue to go back to the board (round not yet over)",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ShowBoard;
        draft.boardControl = PLAYER1.userId;

        const clueAnswer = draft.isAnswered[0][0][0];
        clueAnswer.isAnswered = true;
        clueAnswer.answeredBy.set(PLAYER1.userId, true);

        draft.numAnswered = 1;

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 200 });
        draft.players.set(PLAYER2.userId, PLAYER2);
      }),
    },
    {
      name: "Dismiss clue to go back to the board (round over), same scores so existing player keeps board control",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 1 },
        },
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
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.PreviewRound;
        draft.boardControl = PLAYER2.userId;

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER2.userId, true);

        draft.numAnswered = 0;
        draft.numCluesInBoard = 2;

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 200 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 200 });

        draft.round = 1;
      }),
    },
    {
      name: "Dismiss clue to go back to the board (round over), player with lowest score gets board control",
      state: initialState,
      actions: TWO_PLAYERS_ROUND_1,
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.PreviewRound;
        draft.boardControl = PLAYER2.userId;

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);

        draft.numAnswered = 0;
        draft.numCluesInBoard = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, PLAYER2);
        draft.round = 1;
      }),
    },
    {
      name: "Choose wagerable clue, only player who chose it can wager",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.WagerClue;
        draft.activeClue = [0, 0];
        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);
        draft.boardControl = PLAYER2.userId;

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);

        draft.numAnswered = 0;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 1;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, PLAYER2);
        draft.round = 1;
      }),
    },
    {
      name: "Set clue wager amount, all other players locked out of buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 345 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadWagerableClue;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);

        draft.numAnswered = 0;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 1;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, PLAYER2);
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 345]]));
      }),
    },
    {
      name: "Correct answer to wagered clue adds wager value",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 345 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER2.userId;

        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);
        draft.buzzes.set(PLAYER2.userId, 123);

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const thirdClueAnswer = draft.isAnswered[1][0][0];
        thirdClueAnswer.isAnswered = true;
        thirdClueAnswer.answeredBy.set(PLAYER2.userId, true);

        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 1;

        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 345 });

        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 345]]));
      }),
    },
    {
      name: "Not answering wagered clue deducts wager value",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 345 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 0];
        draft.boardControl = PLAYER2.userId;

        draft.buzzes.set(PLAYER1.userId, CANT_BUZZ_FLAG);
        draft.buzzes.set(PLAYER2.userId, CLUE_TIMEOUT_MS + 1);

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const thirdClueAnswer = draft.isAnswered[1][0][0];
        thirdClueAnswer.isAnswered = true;
        thirdClueAnswer.answeredBy.set(PLAYER2.userId, false);

        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 1;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: -345 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 345]]));
      }),
    },
    {
      name: "Choose long-form clue, only players with positive scores can buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.WagerClue;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER2.userId, CANT_BUZZ_FLAG);

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);

        draft.numAnswered = 0;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 1;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, PLAYER2);
        draft.round = 1;
      }),
    },
    {
      name: "If all players have negative scores, advance past long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_0,
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 0,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, deltaMs: 123 },
        },
        {
          type: ActionType.Buzz,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            deltaMs: CLUE_TIMEOUT_MS + 1,
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: false },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: false },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 5 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;

        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([
                  [PLAYER1.userId, false],
                  [PLAYER2.userId, false],
                ]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map(),
              },
            ],
          ],
        ];

        draft.numAnswered = 2;
        draft.numCluesInBoard = 2;
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: -195 });
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 5]]));
        draft.round = 1;
      }),
    },
    {
      name: "Choose long-form clue, all players can buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.WagerClue;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;

        const firstClueAnswer = draft.isAnswered[0][0][0];
        firstClueAnswer.isAnswered = true;
        firstClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const secondClueAnswer = draft.isAnswered[0][0][1];
        secondClueAnswer.isAnswered = true;
        secondClueAnswer.answeredBy.set(PLAYER1.userId, true);
        const thirdClueAnswer = draft.isAnswered[1][0][0];
        thirdClueAnswer.isAnswered = true;
        thirdClueAnswer.answeredBy.set(PLAYER2.userId, true);

        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.round = 1;
      }),
    },
    {
      name: "Choose long-form clue, wait for 2/2 wagers",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.WagerClue;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set("1,0,1", new Map([[PLAYER1.userId, 400]]));
      }),
    },
    {
      name: "Choose long-form clue, advance to read clue after wagers",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadLongFormClue;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "Wait for all answers to long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.ReadLongFormClue;
        draft.activeClue = [0, 1];
        draft.answers.set("1,0,1", new Map([[PLAYER1.userId, "right answer"]]));
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "Can wager $0 on long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 0 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.WagerClue;
        draft.activeClue = [0, 1];
        draft.boardControl = PLAYER2.userId;
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set("1,0,1", new Map([[PLAYER1.userId, 0]]));
      }),
    },
    {
      name: "Reveal answer to evaluate long-form clue after all answers in",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "wrong answer",
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerLongForm;
        draft.activeClue = [0, 1];
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "right answer"],
            [PLAYER2.userId, "wrong answer"],
          ]),
        );
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.buzzes.set(PLAYER2.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "1 person evaluates their long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "wrong answer",
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: false },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerLongForm;
        draft.activeClue = [0, 1];
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "right answer"],
            [PLAYER2.userId, "wrong answer"],
          ]),
        );
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.buzzes.set(PLAYER2.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map([[PLAYER1.userId, false]]),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "All players evaluated their long-form clues, show answer to all",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "wrong answer",
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: false },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: true },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 1];
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "right answer"],
            [PLAYER2.userId, "wrong answer"],
          ]),
        );
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.buzzes.set(PLAYER2.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([
                  [PLAYER1.userId, false],
                  [PLAYER2.userId, true],
                ]),
              },
            ],
          ],
        ];
        draft.numAnswered = 2;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 800 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "All players evaluated their long-form clues, right then wrong",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "wrong answer",
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: true },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: false },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerToAll;
        draft.activeClue = [0, 1];
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "right answer"],
            [PLAYER2.userId, "wrong answer"],
          ]),
        );
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.buzzes.set(PLAYER2.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([
                  [PLAYER1.userId, false],
                  [PLAYER2.userId, true],
                ]),
              },
            ],
          ],
        ];
        draft.numAnswered = 2;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, PLAYER1);
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 800 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "Can revise long-form clue answers until all answers are in",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "draft answer 1",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "revised answer 1",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "draft answer 2",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "revised answer 2",
          },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.RevealAnswerLongForm;
        draft.activeClue = [0, 1];
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "revised answer 1"],
            [PLAYER2.userId, "draft answer 2"],
          ]),
        );
        draft.boardControl = PLAYER2.userId;
        draft.buzzes.set(PLAYER1.userId, 0);
        draft.buzzes.set(PLAYER2.userId, 0);
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: false,
                answeredBy: new Map(),
              },
            ],
          ],
        ];
        draft.numAnswered = 1;
        draft.numCluesInBoard = 2;
        draft.numExpectedWagers = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 400 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 400 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
    {
      name: "Game ends in GameOver state",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1, userId: PLAYER2.userId },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, wager: 400 },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.SetClueWager,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, wager: 400 },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER1.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Answer,
          payload: {
            userId: PLAYER2.userId,
            i: 0,
            j: 1,
            answer: "right answer",
          },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER1.userId, i: 0, j: 1, correct: true },
        },
        {
          type: ActionType.Check,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: produce(initialState, (draft) => {
        draft.type = GameState.GameOver;
        draft.answers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, "right answer"],
            [PLAYER2.userId, "right answer"],
          ]),
        );
        draft.isAnswered = [
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER1.userId, true]]),
              },
            ],
          ],
          [
            [
              {
                isAnswered: true,
                answeredBy: new Map([[PLAYER2.userId, true]]),
              },
              {
                isAnswered: true,
                answeredBy: new Map([
                  [PLAYER1.userId, true],
                  [PLAYER2.userId, true],
                ]),
              },
            ],
          ],
        ];
        draft.numAnswered = 2;
        draft.numCluesInBoard = 2;
        draft.players.set(PLAYER1.userId, { ...PLAYER1, score: 800 });
        draft.players.set(PLAYER2.userId, { ...PLAYER2, score: 800 });
        draft.round = 1;
        draft.wagers.set("1,0,0", new Map([[PLAYER2.userId, 400]]));
        draft.wagers.set(
          "1,0,1",
          new Map([
            [PLAYER1.userId, 400],
            [PLAYER2.userId, 400],
          ]),
        );
      }),
    },
  ];

  for (const tc of testCases) {
    it(tc.name, () => {
      let state = tc.state;
      for (const action of tc.actions) {
        state = gameEngine(state, action);
      }
      // Previous state is not mutated
      expect(tc.state).toStrictEqual(initialState);

      // Break out state into its own variables for easier debugging
      expect(state.activeClue).toStrictEqual(tc.expectedState.activeClue);
      expect(state.answers).toStrictEqual(tc.expectedState.answers);
      expect(state.boardControl).toBe(tc.expectedState.boardControl);
      expect(state.buzzes).toStrictEqual(tc.expectedState.buzzes);
      expect(state.game).toStrictEqual(tc.expectedState.game);
      expect(state.isAnswered).toStrictEqual(tc.expectedState.isAnswered);
      expect(state.numAnswered).toBe(tc.expectedState.numAnswered);
      expect(state.numCluesInBoard).toBe(tc.expectedState.numCluesInBoard);
      expect(state.numExpectedWagers).toBe(tc.expectedState.numExpectedWagers);
      expect(state.players).toStrictEqual(tc.expectedState.players);
      expect(state.round).toBe(tc.expectedState.round);
      expect(state.type).toBe(tc.expectedState.type);
      expect(state.wagers).toStrictEqual(tc.expectedState.wagers);
    });
  }
});

describe("getWinningBuzzer", () => {
  it("returns the buzz of the lower user ID in case of a tie", () => {
    // NB: Maps iterate over keys in insertion order
    let buzzes = new Map();
    buzzes.set(PLAYER1.userId, 100);
    buzzes.set(PLAYER2.userId, 100);
    expect(getWinningBuzzer(buzzes)?.userId).toBe(PLAYER1.userId);

    buzzes = new Map();
    buzzes.set(PLAYER2.userId, 100);
    buzzes.set(PLAYER1.userId, 100);
    expect(getWinningBuzzer(buzzes)?.userId).toBe(PLAYER1.userId);
  });
});
