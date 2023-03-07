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
  return Array.from(buzzes.entries()).reduce(
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
  const board = game.boards[round];

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
    case ActionType.Reset: {
      return createInitialState(state.game);
    }
    case ActionType.Join: {
      if (isPlayerAction(action)) {
        const nextState = { ...state };
        nextState.players.set(action.payload.userId, {
          ...action.payload,
          score: 0,
        });
        // If this is the first player joining, give them board control.
        if (nextState.players.size === 1) {
          nextState.boardControl = action.payload.userId;
        }
        console.log(action.payload.name, "joined the game");
        return nextState;
      }
      throw new Error("PlayerJoin action must have an associated player");
    }
    case ActionType.ChangeName: {
      if (isPlayerAction(action)) {
        const players = new Map(state.players);
        const player = players.get(action.payload.userId);
        if (!player) {
          players.set(action.payload.userId, {
            ...action.payload,
            score: 0,
          });
        } else {
          players.set(action.payload.userId, {
            ...player,
            name: action.payload.name,
          });
        }
        return { ...state, players };
      }
      throw new Error("PlayerChangeName action must have an associated player");
    }
    case ActionType.StartRound: {
      if (isRoundAction(action)) {
        if (state.type !== GameState.Preview) {
          return state;
        }
        const actionRound = action.payload.round;
        if (actionRound === state.round) {
          console.log("starting round", actionRound);
          return { ...state, type: GameState.WaitForClueChoice };
        }
        console.log("!!!! bad startround msg", actionRound, state.round);
        return state;
      }
      throw new Error("StartRound action must have an associated round number");
    }
    case ActionType.ChooseClue: {
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type === GameState.WaitForClueChoice &&
          state.boardControl === userId &&
          !state.isAnswered[i][j].isAnswered
        ) {
          console.log("choosing clue", i, j, "for round", state.round);
          const nextState = { ...state, type: GameState.ReadClue };
          nextState.activeClue = [i, j];
          return nextState;
        }
        console.log("!!!! bad chooseclue msg", action.payload);
        return state;
      }
      throw new Error("ClickClue action must have an associated index");
    }
    case ActionType.Buzz: {
      if (isBuzzAction(action)) {
        // Ignore this buzz if we're not in the clue-reading stage.
        if (state.type !== GameState.ReadClue) {
          return state;
        }
        const activeClue = state.activeClue;
        // Ignore this buzz if the clue is no longer active.
        if (!activeClue) {
          console.log("!!!! bad buzz msg, no more active clue", action.payload);
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, deltaMs } = action.payload;
        const [i, j] = activeClue;
        // Ignore this buzz if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          console.log(
            "!!!! bad buzz msg, wrong clue",
            activeClue,
            action.payload
          );
          return state;
        }

        const buzzes = state.buzzes ? new Map(state.buzzes) : new Map();

        // Accept this buzz if the user has not already buzzed and the buzz came
        // in before the timeout.
        if (!buzzes.has(userId)) {
          buzzes.set(userId, deltaMs);
        }

        if (deltaMs <= CLUE_TIMEOUT_MS && buzzes.size < state.players.size) {
          return { ...state, buzzes };
        }

        // Evaluate the winner if either:
        //   1. All players have buzzed
        //   2. At least one player has submitted a > 5sec buzz
        // If we missed someone's < 5sec buzz at this point, that's too bad.
        const winningBuzz = getWinningBuzzer(buzzes);
        console.log("winning buzz is", winningBuzz);

        // 1. No one buzzed in: reveal the answer to everyone and mark it as
        // answered
        if (!winningBuzz?.userId) {
          const nextState = {
            ...state,
            buzzes,
            type: GameState.RevealAnswerToAll,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(state.isAnswered, i, j, {
              isAnswered: true,
              answeredBy: undefined,
            }),
          };
          return nextState;
        }

        console.log("only one person buzzed! showing them", i, j);
        // 2. One person buzzed before the time: reveal the answer to only them, let them evaluate correct / no
        return { ...state, type: GameState.RevealAnswerToBuzzer, buzzes };
      }
      throw new Error("Buzz action must have an associated index and delta");
    }
    case ActionType.Answer:
      if (isAnswerAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue) {
          console.log(
            "!!!! bad answer msg, no more active clue",
            action.payload
          );
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, correct } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          console.log(
            "!!!! bad answer msg, wrong clue",
            activeClue,
            action.payload
          );
          return state;
        }
        // Ignore the answer if it was not from the winning buzzer.
        const winningBuzzer = getWinningBuzzer(state.buzzes);
        if (userId !== winningBuzzer?.userId) {
          console.log(
            "!!!! bad answer msg, wrong buzzer",
            winningBuzzer,
            action.payload
          );
          return state;
        }
        // Ignore the answer if the clue has already been answered.
        if (state.isAnswered[i][j].isAnswered) {
          return { ...state, type: GameState.RevealAnswerToAll };
        }

        if (!correct) {
          // If the buzzer was wrong, re-open the buzzers to everyone except
          // those who can no longer buzz.
          const lockedOutBuzzers = state.buzzes
            ? Array.from(state.buzzes.entries()).filter(
                ([_, deltaMs]) => deltaMs === CANT_BUZZ_FLAG
              )
            : [];
          const newBuzzes = new Map([
            ...lockedOutBuzzers,
            [userId, CANT_BUZZ_FLAG],
          ]);
          // If everyone has been locked out, reveal the answer to everyone.
          if (newBuzzes.size === state.players.size) {
            const nextState = {
              ...state,
              type: GameState.RevealAnswerToAll,
              numAnswered: state.numAnswered + 1,
              isAnswered: setIsAnswered(state.isAnswered, i, j, {
                isAnswered: true,
                answeredBy: undefined,
              }),
            };
            return nextState;
          }
          const nextState: State = {
            ...state,
            type: GameState.ReadClue,
            buzzes: newBuzzes,
          };
          console.log("buzzer was wrong :O re-opening buzzers");
          return nextState;
        }

        // If the buzzer was right, reveal the answer to everyone and give the
        // winning buzzer board control.
        const nextState = {
          ...state,
          type: GameState.RevealAnswerToAll,
          boardControl: userId,
          numAnswered: state.numAnswered + 1,
          isAnswered: setIsAnswered(state.isAnswered, i, j, {
            isAnswered: true,
            answeredBy: userId,
          }),
        };
        const player = nextState.players.get(userId);
        if (player) {
          const clueValue = getClueValue(i, state.round);
          nextState.players.set(userId, {
            ...player,
            score: player.score + clueValue,
          });
        }
        return nextState;
      }
      throw new Error(
        "Answer action must have an associated index and correct/incorrect"
      );
    case ActionType.NextClue:
      if (isClueAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue) {
          console.log("!!!! bad next clue msg, no more active clue");
          return state;
        }
        if (state.type !== GameState.RevealAnswerToAll) {
          return state;
        }

        // TODO: make use of user ID?
        const { i: actionI, j: actionJ } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (actionI !== i || actionJ !== j) {
          console.log("!!!! bad next clue msg, wrong clue", activeClue, i, j);
          return state;
        }

        if (state.numAnswered === state.numCluesInBoard) {
          const newRound = state.round + 1;
          const board = state.game.boards[newRound];

          const numCluesInBoard = board
            ? board.categories.reduce(
                (acc, category) => (acc += category.clues.length),
                0
              )
            : 0;
          const n = board ? board.categories[0].clues.length : 0;
          const m = board ? board.categories.length : 0;
          console.log(
            "last clue in board :0",
            numCluesInBoard,
            "/",
            state.numAnswered
          );

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

        console.log("go back to waiting for clue, no more active clue");
        return {
          ...state,
          type: GameState.WaitForClueChoice,
          activeClue: undefined,
          buzzes: new Map(),
        };
      }
      throw new Error("NextClue action must have an associated user");
  }
}
