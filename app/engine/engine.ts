import type { Board } from "~/models/convert.server";
import { generateGrid } from "~/utils";

import {
  isAnswerAction,
  isBuzzAction,
  isCheckAction,
  isClueAction,
  isClueWagerAction,
  isPlayerAction,
  isRoundAction,
} from "./actions";
import type { ClueAnswer } from "./state";
import { GameState, State } from "./state";

export enum ActionType {
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

/** CLUE_TIMEOUT_MS is the total amount of time a contestant has to buzz in after
 * the clue is read. */
export const CLUE_TIMEOUT_MS = 5000;

/** CANT_BUZZ_FLAG means that the player buzzed in wrong, so they can't try again
 * on this clue. */
export const CANT_BUZZ_FLAG = -1;

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

/** gameEngine is the reducer (aka state machine) which implements the game. */
export function gameEngine(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.Join:
      if (isPlayerAction(action)) {
        // Don't add players after the game is over.
        if (state.type === GameState.GameOver) {
          return state;
        }
        const players = new Map(state.players);
        players.set(action.payload.userId, {
          ...action.payload,
          score: 0,
        });
        return State.copy(state, {
          players,
          // If this is the first player joining, give them board control.
          boardControl: players.size === 1 ? action.payload.userId : undefined,
        });
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
        return State.copy(state, { players });
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

        return State.copy(state, { type: GameState.ShowBoard });
      }
      throw new Error("StartRound action must have an associated round number");
    case ActionType.ChooseClue:
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type !== GameState.ShowBoard ||
          state.isAnswered.at(i)?.at(j)?.isAnswered
        ) {
          return state;
        }
        // Any player can choose the final clue.
        const isFinalClue =
          state.round == state.game.boards.length - 1 &&
          state.numCluesInBoard == 1;
        if (!isFinalClue && state.boardControl !== userId) {
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
            return State.copy(state, {
              type: GameState.RevealAnswerToAll,
              activeClue: [i, j],
              isAnswered: setIsAnswered(state.isAnswered, i, j, (prev) => {
                prev.isAnswered = true;
              }),
              numAnswered: state.numAnswered + 1,
            });
          }

          return State.copy(state, {
            buzzes,
            type: GameState.WagerClue,
            activeClue: [i, j],
            numExpectedWagers,
          });
        }

        return State.copy(state, {
          type: GameState.ReadClue,
          activeClue: [i, j],
        });
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

        const board = state.game.boards.at(state.round);
        const clue = board?.categories.at(j)?.clues.at(i);
        if (!clue) {
          return state;
        }

        // Validate wager amount
        const highestClueValue = getHighestClueValue(board);
        const maxWager = clue.longForm
          ? player.score
          : Math.max(player.score, highestClueValue);

        if (maxWager >= 5 && wager < 5) {
          throw new Error("Wager must be at least $5");
        } else if (wager > maxWager) {
          throw new Error(`Wager must be at most $${maxWager}`);
        }

        const wagers = new Map(state.wagers).set(userId, wager);
        // Read the clue once all wagers are in
        if (wagers.size === state.numExpectedWagers) {
          if (clue.longForm) {
            return State.copy(state, {
              type: GameState.ReadLongFormClue,
              wagers,
            });
          }
          return State.copy(state, { type: GameState.ReadClue, wagers });
        }

        return State.copy(state, { wagers });
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
          return State.copy(state, { buzzes });
        }

        // All buzzes are in or we've timed out, so find the winner. If we
        // missed someone's < 5sec buzz at this point, that's too bad.
        const winningBuzz = getWinningBuzzer(buzzes);

        // If there's no winning buzzer, reveal the answer to everyone and mark
        // it as answered. If the clue was wagerable and the player didn't buzz,
        // deduct their wager from their score.
        if (!winningBuzz) {
          const board = state.game.boards.at(state.round);
          const clue = board?.categories.at(j)?.clues.at(i);
          const players = new Map(state.players);
          if (clue?.wagerable) {
            const clueValue = state.getClueValue([i, j], userId);
            const player = state.players.get(userId);
            if (player) {
              players.set(userId, {
                ...player,
                score: player.score - clueValue,
              });
            }
          }

          return State.copy(state, {
            type: GameState.RevealAnswerToAll,
            buzzes,
            isAnswered: setIsAnswered(state.isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
              if (clue?.wagerable) {
                prev.answeredBy.set(userId, false);
              }
            }),
            numAnswered: state.numAnswered + 1,
            players,
          });
        }

        // Reveal the answer to the winning buzzer and let them evaluate its
        // correctness
        return State.copy(state, {
          type: GameState.RevealAnswerToBuzzer,
          buzzes,
        });
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
        }
        answers.set(userId, answer);

        if (buzzes.size < state.players.size) {
          return State.copy(state, { answers, buzzes });
        }

        // All answers are in, so show the answers to all who answered to check them.
        return State.copy(state, {
          type: GameState.RevealAnswerLongForm,
          answers,
          buzzes,
        });
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
        const clueValue = state.getClueValue([i, j], userId);

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
          return State.copy(state, {
            type: GameState.RevealAnswerLongForm,
            players,
            isAnswered,
          });
        }

        if (isLongForm) {
          // Give board control to the player with the highest score after all
          // wagers add up.
          const boardControl = Array.from(players.entries()).sort(
            ([, a], [, b]) => b.score - a.score
          )[0][0];
          return State.copy(state, {
            type: GameState.RevealAnswerToAll,
            boardControl,
            numAnswered: state.numAnswered + 1,
            players,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          });
        }

        // Reveal the answer to everyone and give the winning buzzer board
        // control.
        if (correct) {
          return State.copy(state, {
            type: GameState.RevealAnswerToAll,
            boardControl: userId,
            players,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          });
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
          return State.copy(state, {
            type: GameState.RevealAnswerToAll,
            players,
            numAnswered: state.numAnswered + 1,
            isAnswered: setIsAnswered(isAnswered, i, j, (prev) => {
              prev.isAnswered = true;
            }),
          });
        }

        // If some players have not yet been locked out, re-open the buzzers.
        return State.copy(state, {
          type: GameState.ReadClue,
          players,
          buzzes,
          isAnswered,
        });
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

          if (!board) {
            return State.copy(state, {
              type: GameState.GameOver,
              activeClue: null,
              answers: new Map(),
              boardControl: null,
              buzzes: new Map(),
              numExpectedWagers: 0,
              wagers: new Map(),
            });
          }

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

          const n = board ? board.categories[0].clues.length : 0;
          const m = board ? board.categories.length : 0;

          return State.copy(state, {
            type: GameState.PreviewRound,
            activeClue: null,
            answers: new Map(),
            boardControl: newBoardControl,
            buzzes: new Map(),
            isAnswered: generateGrid<ClueAnswer>(n, m, {
              isAnswered: false,
              answeredBy: new Map(),
            }),
            numAnswered: 0,
            numCluesInBoard: state.getNumCluesInBoard(newRound),
            numExpectedWagers: 0,
            round: newRound,
            wagers: new Map(),
          });
        }

        return State.copy(state, {
          type: GameState.ShowBoard,
          activeClue: null,
          buzzes: new Map(),
          numExpectedWagers: 0,
          wagers: new Map(),
        });
      }
      throw new Error("NextClue action must have an associated user");
  }
}
