import type { Board, Game } from "~/models/convert.server";
import { generateGrid } from "~/utils/utils";
import {
  isAnswerAction,
  isBuzzAction,
  isCheckAction,
  isClueAction,
  isClueWagerAction,
  isPlayerAction,
  isRoundAction,
} from "./actions";

export enum GameState {
  PreviewRound = "PreviewRound",
  ShowBoard = "ShowBoard",
  WagerClue = "WagerClue",
  ReadClue = "ReadClue",
  ReadLongFormClue = "ReadLongFormClue",
  RevealAnswerToBuzzer = "RevealAnswerToBuzzer",
  RevealAnswerLongForm = "RevealAnswerLongForm",
  RevealAnswerToAll = "RevealAnswerToAll",
}

interface ClueAnswer {
  isAnswered: boolean;
  answeredBy: Map<string, boolean>;
}

export interface State {
  type: GameState;
  activeClue?: [number, number];
  answers: Map<string, string>;
  boardControl?: string;
  buzzes: Map<string, number>;
  game: Game;
  /** warning! use setIsAnswered to deep-copy instead of mutating State. */
  isAnswered: ClueAnswer[][];
  numAnswered: number;
  numCluesInBoard: number;
  numExpectedWagers: number;
  players: Map<string, Player>;
  round: number;
  wagers: Map<string, number>;
}

export enum ActionType {
  Reset = "reset",
  Join = "join",
  ChangeName = "change_name",
  StartRound = "start_round",
  ChooseClue = "choose_clue",
  SetClueWager = "set_clue_wager",
  Buzz = "buzz",
  Answer = "answer",
  /** Check marks the player's answer as correct or incorrect and adds/subtracts
   * points.
   */
  Check = "check",
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
export const CANT_BUZZ_FLAG = -1;

export const UNREVEALED_CLUE = "unrevealed";

export function getWinningBuzzer(buzzes: Map<string, number>):
  | {
      userId: string;
      deltaMs: number;
    }
  | undefined {
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
  setFn: (prev: ClueAnswer) => void
) {
  const deepCopy: ClueAnswer[][] = isAnswered.map((row) =>
    row.map(
      (cell): ClueAnswer => ({
        isAnswered: cell.isAnswered,
        answeredBy: new Map(cell.answeredBy),
      })
    )
  );
  setFn(deepCopy[i][j]);
  return deepCopy;
}

/** getClueValue gets the clue's wagered value if it's wagerable and its value on
 * the board otherwise.
 */
export function getClueValue(
  state: State,
  [i, j]: [number, number],
  userId: string
) {
  const board = state.game.boards.at(state.round);
  const clue = board?.categories.at(j)?.clues.at(i);
  if (!clue) {
    throw new Error(`No clue exists at (${i}, ${j})`);
  }
  if (clue.wagerable) {
    return state.wagers.get(userId) ?? 0;
  }
  return clue.value;
}

/** getHighestClueValue gets the highest clue value on the board. */
export function getHighestClueValue(board: Board | undefined) {
  if (!board) {
    return 0;
  }
  let max = 0;
  for (let j = 0; j < board.categories.length; j++) {
    const category = board.categories[j];
    for (let i = 0; i < category.clues.length; i++) {
      const clue = category.clues[i];
      if (clue.value > max) {
        max = clue.value;
      }
    }
  }
  return max;
}

export function createInitialState(game: Game): State {
  const round = 0;
  const board = game.boards.at(round);
  if (!board) {
    throw new Error("board must have at least one round");
  }

  const numCluesInBoard = board.categories.reduce(
    (acc, category) =>
      (acc += category.clues.filter(
        (c) => c.clue.toLowerCase() !== UNREVEALED_CLUE
      ).length),
    0
  );
  const n = board.categories[0].clues.length;
  const m = board.categories.length;

  return {
    type: GameState.PreviewRound,
    answers: new Map(),
    buzzes: new Map(),
    game: game,
    isAnswered: generateGrid<ClueAnswer>(n, m, {
      isAnswered: false,
      answeredBy: new Map(),
    }),
    numAnswered: 0,
    numCluesInBoard,
    numExpectedWagers: 0,
    players: new Map(),
    round,
    wagers: new Map(),
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
        // Game cannot start without any players
        if (state.type !== GameState.PreviewRound || state.players.size === 0) {
          return state;
        }
        const actionRound = action.payload.round;
        if (actionRound !== state.round) {
          return state;
        }

        return { ...state, type: GameState.ShowBoard };
      }
      throw new Error("StartRound action must have an associated round number");
    case ActionType.ChooseClue:
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type !== GameState.ShowBoard ||
          state.boardControl !== userId ||
          state.isAnswered.at(i)?.at(j)?.isAnswered
        ) {
          return state;
        }
        const clue = state.game.boards
          .at(state.round)
          ?.categories.at(j)
          ?.clues.at(i);
        if (!clue) {
          return state;
        }

        if (clue.wagerable) {
          // If long-form, anyone with a positive score can buzz. If not, only the
          // player with board control can buzz.
          if (!clue.longForm && state.boardControl !== userId) {
            return state;
          }
          const allPlayers = Array.from(state.players.entries());
          const buzzes = clue.longForm
            ? new Map(
                allPlayers
                  .filter(([, p]) => p.score <= 0)
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG])
              )
            : new Map(
                allPlayers
                  .filter(([pUserId]) => pUserId !== state.boardControl)
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG])
              );

          const numExpectedWagers = state.players.size - buzzes.size;
          // If no player has enough points to wager, just show the clue.
          if (numExpectedWagers === 0) {
            return {
              ...state,
              type: GameState.RevealAnswerToAll,
              activeClue: [i, j],
              isAnswered: setIsAnswered(state.isAnswered, i, j, (prev) => {
                prev.isAnswered = true;
              }),
              numAnswered: state.numAnswered + 1,
            };
          }

          return {
            ...state,
            buzzes,
            type: GameState.WagerClue,
            activeClue: [i, j],
            numExpectedWagers,
          };
        }

        return {
          ...state,
          type: GameState.ReadClue,
          activeClue: [i, j],
        };
      }
      throw new Error("ClickClue action must have an associated index");
    case ActionType.SetClueWager:
      if (isClueWagerAction(action)) {
        const { userId, i, j, wager } = action.payload;
        const player = state.players.get(userId);
        if (
          state.type !== GameState.WagerClue ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          state.wagers.has(userId) ||
          !player
        ) {
          return state;
        }

        // Validate wager amount
        const board = state.game.boards.at(state.round);
        const highestClueValueInRound = getHighestClueValue(board);
        const maxWager = Math.max(
          state.players.get(userId)?.score ?? 0,
          highestClueValueInRound
        );
        if (maxWager >= 5 && wager < 5) {
          throw new Error("Wager must be at least $5");
        }
        if (wager > maxWager) {
          throw new Error(`Wager must be at most $${maxWager}`);
        }

        const wagers = new Map(state.wagers).set(userId, wager);
        const clue = board?.categories.at(j)?.clues.at(i);
        if (!clue) {
          return state;
        }

        // Read the clue once all wagers are in
        if (wagers.size === state.numExpectedWagers) {
          if (clue.longForm) {
            return {
              ...state,
              type: GameState.ReadLongFormClue,
              wagers,
            };
          }
          return {
            ...state,
            type: GameState.ReadClue,
            wagers,
          };
        }

        return {
          ...state,
          wagers,
        };
      }
      throw new Error("SetClueWager action must have an associated index");
    case ActionType.Buzz:
      if (isBuzzAction(action)) {
        const { userId, i, j, deltaMs } = action.payload;
        if (
          state.type !== GameState.ReadClue ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j
        ) {
          return state;
        }

        const buzzes = new Map(state.buzzes);

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
            isAnswered: setIsAnswered(state.isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
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
        const { userId, i, j, answer } = action.payload;
        if (
          state.type !== GameState.ReadLongFormClue ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          state.buzzes.get(userId) === CANT_BUZZ_FLAG
        ) {
          return state;
        }

        const buzzes = new Map(state.buzzes);
        const answers = new Map(state.answers);
        if (!buzzes.has(userId)) {
          buzzes.set(userId, 0);
          answers.set(userId, answer);
        }

        if (buzzes.size < state.players.size) {
          return { ...state, answers, buzzes };
        }

        // All answers are in, so show the answers to all who answered to check them.
        return {
          ...state,
          type: GameState.RevealAnswerLongForm,
          answers,
          buzzes,
        };
      }
      throw new Error("Answer action must have an associated index and answer");
    case ActionType.Check:
      if (isCheckAction(action)) {
        const { userId, i, j, correct } = action.payload;
        const player = state.players.get(userId);
        if (
          (state.type !== GameState.RevealAnswerToBuzzer &&
            state.type !== GameState.RevealAnswerLongForm) ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          state.isAnswered.at(i)?.at(j)?.isAnswered ||
          !player
        ) {
          return state;
        }
        const isLongForm = state.type === GameState.RevealAnswerLongForm;

        // Ignore the action if it was from a player who didn't answer the clue.
        if (isLongForm) {
          if (!state.answers.has(userId)) {
            return state;
          }
        } else {
          const winningBuzzer = getWinningBuzzer(state.buzzes);
          if (userId !== winningBuzzer?.userId) {
            return state;
          }
        }

        const players = new Map(state.players);
        const clueValue = getClueValue(state, [i, j], userId);

        let isAnswered = setIsAnswered(state.isAnswered, i, j, (prev) => {
          prev.answeredBy.set(userId, correct);
        });
        const numExpectedChecks = isLongForm ? state.answers.size : 1;
        const numChecks = isAnswered.at(i)?.at(j)?.answeredBy.size ?? 0;

        if (correct) {
          players.set(userId, {
            ...player,
            score: player.score + clueValue,
          });
        } else {
          players.set(userId, {
            ...player,
            score: player.score - clueValue,
          });
        }

        // If some players have not yet checked their long-form answer, stay in
        // the current state.
        if (numChecks < numExpectedChecks) {
          return {
            ...state,
            type: GameState.RevealAnswerLongForm,
            players,
            isAnswered,
          };
        }

        if (isLongForm) {
          // Give board control to the player with the highest score after all
          // wagers add up.
          const boardControl = Array.from(players.entries()).sort(
            ([, a], [, b]) => b.score - a.score
          )[0][0];
          return {
            ...state,
            type: GameState.RevealAnswerToAll,
            boardControl,
            numAnswered: state.numAnswered + 1,
            players,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          };
        }

        // Reveal the answer to everyone and give the winning buzzer board
        // control.
        if (correct) {
          return {
            ...state,
            type: GameState.RevealAnswerToAll,
            boardControl: userId,
            players,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          };
        }

        // New buzzes are those previously locked out plus this one.
        const buzzes = new Map(
          Array.from(state.buzzes).filter(
            ([, deltaMs]) => deltaMs === CANT_BUZZ_FLAG
          )
        );
        buzzes.set(userId, CANT_BUZZ_FLAG);

        // If everyone has been locked out, reveal the answer to everyone.
        if (buzzes.size === state.players.size) {
          return {
            ...state,
            type: GameState.RevealAnswerToAll,
            players,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          };
        }

        // If some players have not yet been locked out, re-open the buzzers.
        return {
          ...state,
          type: GameState.ReadClue,
          players,
          buzzes,
          isAnswered,
        };
      }
      throw new Error(
        "Check action must have an associated index and correct/incorrect"
      );
    case ActionType.NextClue:
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        // Ignore this action if the clue is no longer active.
        if (
          state.type !== GameState.RevealAnswerToAll ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          !state.players.has(userId)
        ) {
          return state;
        }

        if (state.numAnswered === state.numCluesInBoard) {
          const newRound = state.round + 1;
          const board = state.game.boards.at(newRound);

          const numCluesInBoard = board
            ? board.categories.reduce(
                (acc, category) =>
                  (acc += category.clues.filter(
                    (c) => c.clue.toLowerCase() !== UNREVEALED_CLUE
                  ).length),
                0
              )
            : 0;
          const n = board ? board.categories[0].clues.length : 0;
          const m = board ? board.categories.length : 0;

          // Board control goes to the player with the lowest score. In the
          // case of a tie, keep the same player in control.
          const lowestScoringPlayer = Array.from(state.players.values()).sort(
            (a, b) => a.score - b.score
          )[0];

          let newBoardControl = lowestScoringPlayer.userId;
          if (state.boardControl) {
            const controllingPlayer = state.players.get(state.boardControl);
            if (controllingPlayer?.score === lowestScoringPlayer.score) {
              newBoardControl = controllingPlayer.userId;
            }
          }

          return {
            ...state,
            type: GameState.PreviewRound,
            activeClue: undefined,
            answers: new Map(),
            boardControl: newBoardControl,
            buzzes: new Map(),
            isAnswered: generateGrid<ClueAnswer>(n, m, {
              isAnswered: false,
              answeredBy: new Map(),
            }),
            numAnswered: 0,
            numCluesInBoard,
            numExpectedWagers: 0,
            round: newRound,
            wagers: new Map(),
          };
        }

        return {
          ...state,
          type: GameState.ShowBoard,
          activeClue: undefined,
          buzzes: new Map(),
          numExpectedWagers: 0,
          wagers: new Map(),
        };
      }
      throw new Error("NextClue action must have an associated user");
  }
}
