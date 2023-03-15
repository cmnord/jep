import { MOCK_GAME } from "~/models/mock.server";
import type { Action, Player, State } from "./engine";
import { ActionType, createInitialState, gameEngine } from "./engine";

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
      actions: [
        {
          type: ActionType.Join,
          payload: { name: PLAYER1.name, userId: PLAYER1.userId },
        },
      ],
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
        {
          type: ActionType.Join,
          payload: { name: PLAYER1.name, userId: PLAYER1.userId },
        },
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
      actions: [
        {
          type: ActionType.Join,
          payload: { name: PLAYER1.name, userId: PLAYER1.userId },
        },
        {
          type: ActionType.Join,
          payload: { name: PLAYER2.name, userId: PLAYER2.userId },
        },
      ],
      expectedState: {
        ...initialState,
        boardControl: PLAYER1.userId,
        players: new Map([
          [PLAYER1.userId, PLAYER1],
          [PLAYER2.userId, PLAYER2],
        ]),
      },
    },
  ];

  for (const tc of testCases) {
    it(tc.name, () => {
      let state = tc.state;
      for (const action of tc.actions) {
        state = gameEngine(state, action);
      }
      expect(tc.state).toStrictEqual(initialState);
      expect(state).toStrictEqual(tc.expectedState);
    });
  }
});
