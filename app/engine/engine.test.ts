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
import { GameState, State } from "./state";

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
    payload: { round: 0 },
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

  const initialState = State.fromGame(MOCK_GAME);

  const testCases: TestCase[] = [
    {
      name: "Player joins",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION],
      expectedState: State.copy(initialState, {
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
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
      expectedState: State.copy(initialState, {
        boardControl: PLAYER1.userId,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, name: "Player New Name" }],
        ]),
      }),
    },
    {
      name: "Two players join, first gets board control",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION, PLAYER2_JOIN_ACTION],
      expectedState: State.copy(initialState, {
        boardControl: PLAYER1.userId,
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      }),
    },
    {
      name: "Round start",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0 },
        },
      ],
      expectedState: State.copy(initialState, {
        type: GameState.ShowBoard,
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      }),
    },
    {
      name: "Choose clue",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
      ],
      expectedState: State.copy(initialState, {
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      }),
    },
    {
      name: "If the only player in the game buzzes in for clue, show them the answer",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        players: new Map([[PLAYER1.userId, PLAYER1]]),
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
      expectedState: State.copy(initialState, {
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([
          [PLAYER1.userId, 123],
          [PLAYER2.userId, 456],
        ]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([
          [PLAYER1.userId, 123],
          [PLAYER2.userId, CLUE_TIMEOUT_MS + 1],
        ]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      }),
    },
    {
      name: "If one player buzzes in and then times out without a response from the other player, reveal answer to buzzer",
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      }),
    },
    {
      name: "If one player times out, ignore further buzzes",
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, CLUE_TIMEOUT_MS + 1]]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      }),
    },
    {
      name: "If single player is incorrect, reveal to all",
      state: initialState,
      actions: [
        PLAYER1_JOIN_ACTION,
        {
          type: ActionType.StartRound,
          payload: { round: 0 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        isAnswered: [
          [
            {
              isAnswered: true,
              answeredBy: new Map([[PLAYER1.userId, false]]),
            },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        players: new Map([[PLAYER1.userId, { ...PLAYER1, score: -200 }]]),
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
      expectedState: State.copy(initialState, {
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        isAnswered: [
          [
            {
              isAnswered: false,
              answeredBy: new Map([[PLAYER1.userId, false]]),
            },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: -200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, 123],
        ]),
        isAnswered: [
          [
            {
              isAnswered: false,
              answeredBy: new Map([[PLAYER1.userId, false]]),
            },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: -200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        isAnswered: [
          [
            {
              isAnswered: true,
              answeredBy: new Map([
                [PLAYER1.userId, false],
                [PLAYER2.userId, true],
              ]),
            },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, 123],
        ]),
        numAnswered: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: -200 }],
          [PLAYER2.userId, { ...PLAYER2, score: 200 }],
        ]),
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
      expectedState: State.copy(initialState, {
        type: GameState.ShowBoard,
        boardControl: PLAYER1.userId,
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER1.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
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
          payload: { userId: PLAYER1.userId, i: 0, j: 1 },
        },
      ],
      expectedState: State.copy(initialState, {
        type: GameState.PreviewRound,
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 200 }],
          [PLAYER2.userId, { ...PLAYER2, score: 200 }],
        ]),
        round: 1,
      }),
    },
    {
      name: "Dismiss clue to go back to the board (round over), player with lowest score gets board control",
      state: initialState,
      actions: TWO_PLAYERS_ROUND_1,
      expectedState: State.copy(initialState, {
        type: GameState.PreviewRound,
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
      }),
    },
    {
      name: "Choose wagerable clue, only player who chose it can wager",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 0 },
        },
      ],
      expectedState: State.copy(initialState, {
        type: GameState.WagerClue,
        activeClue: [0, 0],
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        numExpectedWagers: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
      }),
    },
    {
      name: "Set clue wager amount, all other players locked out of buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.ReadWagerableClue,
        activeClue: [0, 0],
        boardControl: PLAYER2.userId,
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        isAnswered: [
          [
            { isAnswered: false, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        numExpectedWagers: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER2.userId, 345]]),
      }),
    },
    {
      name: "Correct answer to wagered clue adds wager value",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, 123],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 345 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER2.userId, 345]]),
      }),
    },
    {
      name: "Not answering wagered clue deducts wager value",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, CLUE_TIMEOUT_MS + 1],
        ]),
        isAnswered: [
          [
            {
              isAnswered: true,
              answeredBy: new Map([[PLAYER2.userId, false]]),
            },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: -345 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER2.userId, 345]]),
      }),
    },
    {
      name: "Choose long-form clue, only players with positive scores can buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
        },
        {
          type: ActionType.ChooseClue,
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
      ],
      expectedState: State.copy(initialState, {
        type: GameState.WagerClue,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        buzzes: new Map([[PLAYER2.userId, CANT_BUZZ_FLAG]]),
        isAnswered: [
          [
            { isAnswered: false, answeredBy: new Map() },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        numExpectedWagers: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
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
          payload: { userId: PLAYER2.userId, i: 0, j: 1 },
        },
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: true, answeredBy: new Map() },
          ],
        ],
        numAnswered: 2,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 0 }],
          [PLAYER2.userId, { ...PLAYER2, score: -195 }],
        ]),
        round: 1,
      }),
    },
    {
      name: "Choose long-form clue, all players can buzz",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.WagerClue,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        buzzes: new Map(),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
      }),
    },
    {
      name: "Choose long-form clue, wait for 2/2 wagers",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.WagerClue,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        buzzes: new Map(),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER1.userId, 400]]),
      }),
    },
    {
      name: "Choose long-form clue, advance to read clue after wagers",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.ReadLongFormClue,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        buzzes: new Map(),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "Wait for all answers to long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.ReadLongFormClue,
        activeClue: [0, 1],
        answers: new Map([[PLAYER1.userId, "right answer"]]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([[PLAYER1.userId, 0]]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "Reveal answer to evaluate long-form clue after all answers in",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerLongForm,
        activeClue: [0, 1],
        answers: new Map([
          [PLAYER1.userId, "right answer"],
          [PLAYER2.userId, "wrong answer"],
        ]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, 0],
          [PLAYER2.userId, 0],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "1 person evaluates their long-form clue",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerLongForm,
        activeClue: [0, 1],
        answers: new Map([
          [PLAYER1.userId, "right answer"],
          [PLAYER2.userId, "wrong answer"],
        ]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, 0],
          [PLAYER2.userId, 0],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            {
              isAnswered: false,
              answeredBy: new Map([[PLAYER1.userId, false]]),
            },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 0 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "All players evaluated their long-form clues, show answer to all",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 1],
        answers: new Map([
          [PLAYER1.userId, "right answer"],
          [PLAYER2.userId, "wrong answer"],
        ]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, 0],
          [PLAYER2.userId, 0],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            {
              isAnswered: true,
              answeredBy: new Map([
                [PLAYER1.userId, false],
                [PLAYER2.userId, true],
              ]),
            },
          ],
        ],
        numAnswered: 2,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 0 }],
          [PLAYER2.userId, { ...PLAYER2, score: 800 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "All players evaluated their long-form clues, right then wrong",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 1],
        answers: new Map([
          [PLAYER1.userId, "right answer"],
          [PLAYER2.userId, "wrong answer"],
        ]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, 0],
          [PLAYER2.userId, 0],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            {
              isAnswered: true,
              answeredBy: new Map([
                [PLAYER2.userId, true],
                [PLAYER1.userId, false],
              ]),
            },
          ],
        ],
        numAnswered: 2,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 0 }],
          [PLAYER2.userId, { ...PLAYER2, score: 800 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "Can revise long-form clue answers until all answers are in",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.RevealAnswerLongForm,
        activeClue: [0, 1],
        answers: new Map([
          [PLAYER1.userId, "revised answer 1"],
          [PLAYER2.userId, "draft answer 2"],
        ]),
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, 0],
          [PLAYER2.userId, 0],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            { isAnswered: false, answeredBy: new Map() },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        numExpectedWagers: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 400 }],
        ]),
        round: 1,
        wagers: new Map([
          [PLAYER1.userId, 400],
          [PLAYER2.userId, 400],
        ]),
      }),
    },
    {
      name: "Game ends in GameOver state",
      state: initialState,
      actions: [
        ...TWO_PLAYERS_ROUND_1,
        {
          type: ActionType.StartRound,
          payload: { round: 1 },
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
      expectedState: State.copy(initialState, {
        type: GameState.GameOver,
        isAnswered: [
          [
            { isAnswered: true, answeredBy: new Map([[PLAYER2.userId, true]]) },
            {
              isAnswered: true,
              answeredBy: new Map([
                [PLAYER1.userId, true],
                [PLAYER2.userId, true],
              ]),
            },
          ],
        ],
        numAnswered: 2,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 800 }],
          [PLAYER2.userId, { ...PLAYER2, score: 800 }],
        ]),
        round: 1,
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
      expect(state).toStrictEqual(tc.expectedState);
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
