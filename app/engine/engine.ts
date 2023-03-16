import type { Game } from "~/models/convert.server";
import { generateGrid, getClueValue } from "~/utils/utils";
import {
  isAnswerAction,
  isBuzzAction,
  isClueAction,
  isPlayerAction,
  isRoundAction,
} from "./actions";

export enum GameState {
  Preview = "Preview",
  WaitForClueChoice = "WaitForClueChoice",
  ReadClue = "ReadClue",
  RevealAnswerToBuzzer = "RevealAnswerToBuzzer",
  RevealAnswerToAll = "RevealAnswerToAll",
}

interface ClueAnswer {
  isAnswered: boolean;
  answeredBy?: string;
}

export interface State {
  type: GameState;
  activeClue?: [number, number];
  boardControl?: string;
  buzzes?: Map<string, number>;
  game: Game;
  /** warning! use setIsAnswered to deep-copy instead of mutating State. */
  isAnswered: ClueAnswer[][];
  numAnswered: number;
  numCluesInBoard: number;
  players: Map<string, Player>;
  round: number;
}

export enum ActionType {
  Reset = "reset",
  Join = "join",
  ChangeName = "change_name",
  StartRound = "start_round",
  ChooseClue = "choose_clue",
  Buzz = "buzz",
  Answer = "answer",
  NextClue = "next_clue",
}

export interface Action {
  type: ActionType;
  payload?: unknown;
}

export interface Player {
  userId: string;
  name: string;
  score: number;
}

/** CLUE_TIMEOUT_MS is the total amount of time a contestant has to buzz in after
 * the clue is read. */
export const CLUE_TIMEOUT_MS = 5000;

/** CANT_BUZZ_FLAG means that the player buzzed in wrong, so they can't try again
 * on this clue. */
const CANT_BUZZ_FLAG = -1;

export function getWinningBuzzer(buzzes?: Map<string, number>):
  | {
      userId: string;
      deltaMs: number;
    }
  | undefined {
  if (!buzzes) {
    return undefined;
  }

  const result = Array.from(buzzes.entries()).reduce(
    (acc, [userId, deltaMs]) => {
      if (
        deltaMs !== CANT_BUZZ_FLAG &&
        deltaMs < acc.deltaMs &&
        deltaMs < CLUE_TIMEOUT_MS
      ) {
        return { userId, deltaMs };
      }
      return acc;
    },
    { userId: "", deltaMs: Number.MAX_SAFE_INTEGER }
  );

  if (result.userId === "") {
    return undefined;
  }

  return result;
}

/** setIsAnswered makes a deep copy of the 2d array, then sets the value at (i, j). */
function setIsAnswered(
  isAnswered: ClueAnswer[][],
  i: number,
  j: number,
  val: ClueAnswer
) {
  const deepCopy: ClueAnswer[][] = isAnswered.map((row) =>
    row.map((cell) => ({
      isAnswered: cell.isAnswered,
      answeredBy: cell.answeredBy,
    }))
  );
  deepCopy[i][j] = val;
  return deepCopy;
}

export function createInitialState(game: Game): State {
  const round = 0;
  const board = game.boards.at(round);
  if (!board) {
    throw new Error("board must have at least one round");
  }

  const numCluesInBoard = board.categories.reduce(
    (acc, category) => (acc += category.clues.length),
    0
  );
  const n = board.categories[0].clues.length;
  const m = board.categories.length;

  return {
    type: GameState.Preview,
    game: game,
    isAnswered: generateGrid(n, m, {
      isAnswered: false,
      answeredBy: undefined,
    }),
    numAnswered: 0,
    numCluesInBoard,
    players: new Map(),
    round,
  };
}

/** gameEngine is the reducer (aka state machine) which implements the game. */
export function gameEngine(state: State, action: Action): State {
  console.log("-----applying room event", action.type);
  switch (action.type) {
    case ActionType.Reset:
      return createInitialState(state.game);
    case ActionType.Join:
      if (isPlayerAction(action)) {
        const players = new Map(state.players);
        players.set(action.payload.userId, {
          ...action.payload,
          score: 0,
        });
        const nextState = { ...state, players };
        // If this is the first player joining, give them board control.
        if (players.size === 1) {
          nextState.boardControl = action.payload.userId;
        }
        return nextState;
      }
      throw new Error("PlayerJoin action must have an associated player");
    case ActionType.ChangeName:
      if (isPlayerAction(action)) {
        const players = new Map(state.players);
        const player = players.get(action.payload.userId);
        // Player must already exist to change name
        if (!player) {
          return state;
        }

        players.set(action.payload.userId, {
          ...player,
          name: action.payload.name,
        });
        return { ...state, players };
      }
      throw new Error("PlayerChangeName action must have an associated player");
    case ActionType.StartRound:
      if (isRoundAction(action)) {
        if (state.type !== GameState.Preview) {
          return state;
        }
        // Game cannot start without any players
        if (state.players.size === 0) {
          return state;
        }
        const actionRound = action.payload.round;
        if (actionRound === state.round) {
          return { ...state, type: GameState.WaitForClueChoice };
        }
        return state;
      }
      throw new Error("StartRound action must have an associated round number");
    case ActionType.ChooseClue:
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type !== GameState.WaitForClueChoice ||
          state.boardControl !== userId ||
          state.isAnswered.at(i)?.at(j)?.isAnswered
        ) {
          return state;
        }
        return {
          ...state,
          type: GameState.ReadClue,
          activeClue: [i, j],
        };
      }
      throw new Error("ClickClue action must have an associated index");
    case ActionType.Buzz:
      if (isBuzzAction(action)) {
        // Ignore this buzz if we're not in the clue-reading stage.
        if (state.type !== GameState.ReadClue) {
          return state;
        }
        const activeClue = state.activeClue;
        // Ignore this buzz if the clue is no longer active.
        if (!activeClue) {
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, deltaMs } = action.payload;
        const [i, j] = activeClue;
        // Ignore this buzz if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          return state;
        }

        const buzzes: Map<string, number> = state.buzzes
          ? new Map(state.buzzes)
          : new Map();

        // Accept this buzz if the user has not already buzzed and the buzz came
        // in before the timeout.
        if (!buzzes.has(userId)) {
          buzzes.set(userId, deltaMs);
        }

        // Wait for others to buzz in if we haven't yet received buzzes from all
        // players or a timeout buzz.
        if (deltaMs <= CLUE_TIMEOUT_MS && buzzes.size < state.players.size) {
          return { ...state, buzzes };
        }

        // All buzzes are in or we've timed out, so find the winner. If we
        // missed someone's < 5sec buzz at this point, that's too bad.
        const winningBuzz = getWinningBuzzer(buzzes);

        // If there's no winning buzzer, reveal the answer to everyone and mark
        // it as answered
        if (!winningBuzz) {
          return {
            ...state,
            buzzes,
            type: GameState.RevealAnswerToAll,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(state.isAnswered, i, j, {
              isAnswered: true,
              answeredBy: undefined,
            }),
          };
        }

        // Reveal the answer to the winning buzzer and let them evaluate its
        // correctness
        return { ...state, type: GameState.RevealAnswerToBuzzer, buzzes };
      }
      throw new Error("Buzz action must have an associated index and delta");
    case ActionType.Answer:
      if (isAnswerAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue) {
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, correct } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          return state;
        }
        // Ignore the answer if it was not from the winning buzzer or it has
        // already been answered.
        const winningBuzzer = getWinningBuzzer(state.buzzes);
        if (
          userId !== winningBuzzer?.userId ||
          state.isAnswered.at(i)?.at(j)?.isAnswered
        ) {
          return state;
        }

        const players = new Map(state.players);
        const player = players.get(userId);
        if (!player) {
          throw new Error("Player not found in state");
        }
        const clueValue = getClueValue(i, state.round);

        if (correct) {
          // Reveal the answer to everyone, add points, and give the winning
          // buzzer board control.
          players.set(userId, {
            ...player,
            score: player.score + clueValue,
          });

          return {
            ...state,
            type: GameState.RevealAnswerToAll,
            boardControl: userId,
            numAnswered: state.numAnswered + 1,
            players,
            isAnswered: setIsAnswered(state.isAnswered, i, j, {
              isAnswered: true,
              answeredBy: userId,
            }),
          };
        }

        // If the buzzer was wrong, reduce their points.
        players.set(userId, {
          ...player,
          score: player.score - clueValue,
        });
        const lockedOutBuzzers = Array.from(state.buzzes ?? []).filter(
          ([_, deltaMs]) => deltaMs === CANT_BUZZ_FLAG
        );
        const newBuzzes = new Map([
          ...lockedOutBuzzers,
          [userId, CANT_BUZZ_FLAG],
        ]);
        // If everyone has been locked out, reveal the answer to everyone.
        if (newBuzzes.size === state.players.size) {
          return {
            ...state,
            type: GameState.RevealAnswerToAll,
            players,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(state.isAnswered, i, j, {
              isAnswered: true,
              answeredBy: undefined,
            }),
          };
        }

        // If some players have not yet been locked out, re-open the buzzers.
        return {
          ...state,
          type: GameState.ReadClue,
          players,
          buzzes: newBuzzes,
        };
      }
      throw new Error(
        "Answer action must have an associated index and correct/incorrect"
      );
    case ActionType.NextClue:
      if (isClueAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue || state.type !== GameState.RevealAnswerToAll) {
          return state;
        }

        // TODO: make use of user ID?
        const { i: actionI, j: actionJ } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (actionI !== i || actionJ !== j) {
          return state;
        }

        if (state.numAnswered === state.numCluesInBoard) {
          const newRound = state.round + 1;
          const board = state.game.boards.at(newRound);

          const numCluesInBoard = board
            ? board.categories.reduce(
                (acc, category) => (acc += category.clues.length),
                0
              )
            : 0;
          const n = board ? board.categories[0].clues.length : 0;
          const m = board ? board.categories.length : 0;

          return {
            type: GameState.Preview,
            boardControl: state.boardControl,
            game: state.game,
            isAnswered: generateGrid(n, m, {
              isAnswered: false,
              answeredBy: undefined,
            }),
            numAnswered: 0,
            numCluesInBoard,
            players: state.players,
            round: newRound,
          };
        }

        return {
          ...state,
          type: GameState.WaitForClueChoice,
          activeClue: undefined,
          buzzes: undefined,
        };
      }
      throw new Error("NextClue action must have an associated user");
  }
}
