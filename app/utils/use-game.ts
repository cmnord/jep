import * as React from "react";

import { Game, Clue } from "~/models/convert.server";
import { generateGrid } from "./utils";

export enum GameState {
  Preview = "Preview",
  Open = "Open",
  Prompt = "Prompt",
}

interface State {
  type: GameState;
  activeClue?: [number, number];
  game: Game;
  isAnswered: boolean[][];
  numAnswered: number;
  numCluesInBoard: number;
  round: number;
}

function createInitialState(game: Game, round: number) {
  const board = game.boards[round];

  const numCluesInBoard = board.categories.reduce(
    (acc, category) => (acc += category.clues.length),
    0
  );
  const n = board.categories[0].clues.length;
  const m = board.categories.length;

  return {
    type: GameState.Preview,
    game,
    isAnswered: generateGrid(n, m, false),
    numAnswered: 0,
    numCluesInBoard,
    round,
  };
}

enum ActionType {
  DismissPreview = "DismissPreview",
  ClickClue = "ClickClue",
  AnswerClue = "AnswerClue",
}

interface Action {
  type: ActionType;
  payload?: unknown;
}

interface IndexedAction extends Action {
  type: ActionType;
  payload: [number, number];
}

function isIndexedAction(action: Action): action is IndexedAction {
  return action.type === ActionType.ClickClue;
}

/** gameReducer is the state machine which implements the game. */
function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.DismissPreview:
      const nextState = { ...state };

      nextState.type = GameState.Open;

      return nextState;
    case ActionType.ClickClue: {
      if (isIndexedAction(action)) {
        const [i, j] = action.payload;
        if (state.isAnswered[i][j]) {
          return state;
        }

        const nextState = { ...state };
        nextState.type = GameState.Prompt;
        nextState.activeClue = [i, j];

        return nextState;
      }
      throw new Error("ClickClue action must have an associated index");
    }
    case ActionType.AnswerClue: {
      const newNumAnswered = state.numAnswered + 1;

      if (newNumAnswered === state.numCluesInBoard) {
        const newRound = state.round++;
        const nextState = createInitialState(state.game, newRound);
        return nextState;
      }

      const nextState = { ...state };
      const activeClue = state.activeClue;
      if (!activeClue) {
        throw new Error("cannot answer clue if no clue was active");
      }
      const [i, j] = activeClue;
      nextState.isAnswered[i][j] = true;
      nextState.activeClue = undefined;
      nextState.type = GameState.Open;
      nextState.numAnswered = newNumAnswered;

      return nextState;
    }
  }
}

/** useGame provides all the state variables associated with a game and methods
 * to change them. */
export function useGame(game: Game) {
  const [state, dispatch] = React.useReducer(gameReducer, game, () =>
    createInitialState(game, 0)
  );

  const board = game.boards[state.round];

  let clue: Clue | undefined;
  let category: string | undefined;
  if (state.activeClue) {
    const [i, j] = state.activeClue;
    clue = state.activeClue ? board.categories[j].clues[i] : undefined;
    category = state.activeClue ? board.categoryNames[j] : undefined;
  }

  const onClickClue = (i: number, j: number) => {
    dispatch({ type: ActionType.ClickClue, payload: [i, j] });
  };

  const onClosePreview = () => dispatch({ type: ActionType.DismissPreview });

  const onClosePrompt = () => {
    dispatch({ type: ActionType.AnswerClue });
  };

  const isAnswered = (i: number, j: number) => state.isAnswered[i][j];

  return {
    type: state.type,
    board,
    category,
    clue,
    isAnswered,
    onClickClue,
    onClosePreview,
    onClosePrompt,
    round: state.round,
  };
}
