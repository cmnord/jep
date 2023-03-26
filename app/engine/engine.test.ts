import { MOCK_GAME } from "~/models/mock.server";
import type { Action, Player, State } from "./engine";
import {
  ActionType,
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  createInitialState,
  gameEngine,
  GameState,
} from "./engine";

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
    type: ActionType.Answer,
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
    type: ActionType.Answer,
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

  const initialState = createInitialState(MOCK_GAME);

  const testCases: TestCase[] = [
    {
      name: "Player joins",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION],
      expectedState: {
        ...initialState,
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      },
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
      expectedState: {
        ...initialState,
        boardControl: PLAYER1.userId,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, name: "Player New Name" }],
        ]),
      },
    },
    {
      name: "Two players join, first gets board control",
      state: initialState,
      actions: [PLAYER1_JOIN_ACTION, PLAYER2_JOIN_ACTION],
      expectedState: {
        ...initialState,
        boardControl: PLAYER1.userId,
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.ShowBoard,
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        players: new Map([[PLAYER1.userId, PLAYER1]]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
      expectedState: {
        ...initialState,
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
      },
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
            deltaMs: CLUE_TIMEOUT_MS,
          },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([
          [PLAYER1.userId, 123],
          [PLAYER2.userId, CLUE_TIMEOUT_MS],
        ]),
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, CLUE_TIMEOUT_MS + 1]]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 1,
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, 123]]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 1,
        players: new Map([[PLAYER1.userId, { ...PLAYER1, score: -200 }]]),
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: -200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToBuzzer,
        activeClue: [0, 0],
        boardControl: PLAYER1.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, 123],
        ]),
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: -200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: false },
        },
        {
          type: ActionType.Buzz,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, deltaMs: 123 },
        },
        {
          type: ActionType.Answer,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        isAnswered: [
          [
            { isAnswered: true, answeredBy: PLAYER2.userId },
            { isAnswered: false, answeredBy: undefined },
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
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER1.userId, i: 0, j: 0, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 0 },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.ShowBoard,
        activeClue: undefined,
        boardControl: PLAYER1.userId,
        buzzes: undefined,
        isAnswered: [
          [
            { isAnswered: true, answeredBy: PLAYER1.userId },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 1,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 200 }],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
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
          type: ActionType.Answer,
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
          type: ActionType.Answer,
          payload: { userId: PLAYER2.userId, i: 0, j: 1, correct: true },
        },
        {
          type: ActionType.NextClue,
          payload: { userId: PLAYER1.userId, i: 0, j: 1 },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.PreviewRound,
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 200 }],
          [PLAYER2.userId, { ...PLAYER2, score: 200 }],
        ]),
        round: 1,
      },
    },
    {
      name: "Dismiss clue to go back to the board (round over), player with lowest score gets board control",
      state: initialState,
      actions: TWO_PLAYERS_ROUND_1,
      expectedState: {
        ...initialState,
        type: GameState.PreviewRound,
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
      },
    },
    {
      name: "Choose wagerable clue, only player that chose it can wager",
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
      expectedState: {
        ...initialState,
        type: GameState.WagerClue,
        activeClue: [0, 0],
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        boardControl: PLAYER2.userId,
        isAnswered: [
          [
            { isAnswered: false, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
      },
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
      expectedState: {
        ...initialState,
        type: GameState.ReadClue,
        activeClue: [0, 0],
        boardControl: PLAYER2.userId,
        buzzes: new Map([[PLAYER1.userId, CANT_BUZZ_FLAG]]),
        isAnswered: [
          [
            { isAnswered: false, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER2.userId, 345]]),
      },
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
          type: ActionType.Answer,
          payload: { userId: PLAYER2.userId, i: 0, j: 0, correct: true },
        },
      ],
      expectedState: {
        ...initialState,
        type: GameState.RevealAnswerToAll,
        activeClue: [0, 0],
        boardControl: PLAYER2.userId,
        buzzes: new Map([
          [PLAYER1.userId, CANT_BUZZ_FLAG],
          [PLAYER2.userId, 123],
        ]),
        isAnswered: [
          [
            { isAnswered: true, answeredBy: PLAYER2.userId },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 1,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 345 }],
        ]),
        round: 1,
        wagers: new Map([[PLAYER2.userId, 345]]),
      },
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
      expectedState: {
        ...initialState,
        type: GameState.WagerClue,
        activeClue: [0, 1],
        boardControl: PLAYER2.userId,
        buzzes: new Map([[PLAYER2.userId, CANT_BUZZ_FLAG]]),
        isAnswered: [
          [
            { isAnswered: false, answeredBy: undefined },
            { isAnswered: false, answeredBy: undefined },
          ],
        ],
        numAnswered: 0,
        numCluesInBoard: 2,
        players: new Map([
          [PLAYER1.userId, { ...PLAYER1, score: 400 }],
          [PLAYER2.userId, { ...PLAYER2, score: 0 }],
        ]),
        round: 1,
      },
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
