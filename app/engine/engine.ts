import { enableMapSet, produce } from "immer";

import type { Board } from "~/models/convert.server";

import {
  isAnswerAction,
  isBuzzAction,
  isCheckAction,
  isClueAction,
  isClueWagerAction,
  isPlayerAction,
  isRoundAction,
} from "./actions";
import { GameState, getClueValue, getNumCluesInBoard, State } from "./state";

enableMapSet();

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
 * the clue is read, inclusive. */
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
  const result = Array.from(buzzes.entries())
    // Sort buzzes by user ID for deterministic results in case of a tie.
    .sort(([aUserId], [bUserId]) => (aUserId > bUserId ? 1 : -1))
    .reduce(
      (acc, [userId, deltaMs]) => {
        if (
          deltaMs !== CANT_BUZZ_FLAG &&
          deltaMs < acc.deltaMs &&
          deltaMs <= CLUE_TIMEOUT_MS
        ) {
          return { userId, deltaMs };
        }
        return acc;
      },
      { userId: "", deltaMs: Number.MAX_SAFE_INTEGER },
    );

  if (result.userId === "") {
    return undefined;
  }

  return result;
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
        return produce(state, (draft) => {
          draft.players.set(action.payload.userId, {
            ...action.payload,
            score: 0,
          });
          // If this is the first player joining, give them board control.
          if (draft.players.size === 1) {
            draft.boardControl = action.payload.userId;
          }
        });
      }
      throw new Error("PlayerJoin action must have an associated player");
    case ActionType.ChangeName:
      if (isPlayerAction(action)) {
        return produce(state, (draft) => {
          const player = draft.players.get(action.payload.userId);
          // Player must already exist to change name
          if (player) {
            player.name = action.payload.name;
          }
        });
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

        return produce(state, (draft) => {
          draft.type = GameState.ShowBoard;
        });
      }
      throw new Error("StartRound action must have an associated round number");
    case ActionType.ChooseClue:
      if (isClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type !== GameState.ShowBoard ||
          state.isAnswered.at(state.round)?.at(i)?.at(j)?.isAnswered
        ) {
          return state;
        }
        // Any player can choose the final clue.
        const board = state.game.boards[state.round];
        const isSingleLongFormClue =
          board.categories.length === 1 &&
          board.categories[0].clues.length === 1 &&
          board.categories[0].clues[0].longForm;
        if (!isSingleLongFormClue && state.boardControl !== userId) {
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
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG]),
              )
            : new Map(
                allPlayers
                  .filter(([pUserId]) => pUserId !== state.boardControl)
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG]),
              );

          const numExpectedWagers = state.players.size - buzzes.size;
          // If no player has enough points to wager, just show the clue.
          if (numExpectedWagers === 0) {
            return produce(state, (draft) => {
              draft.type = GameState.RevealAnswerToAll;
              draft.activeClue = [i, j];
              const clueAnswer = draft.isAnswered[draft.round][i][j];
              clueAnswer.isAnswered = true;
              draft.numAnswered += 1;
            });
          }

          return produce(state, (draft) => {
            draft.buzzes = buzzes;
            draft.type = GameState.WagerClue;
            draft.activeClue = [i, j];
            draft.numExpectedWagers = numExpectedWagers;
          });
        }

        return produce(state, (draft) => {
          draft.type = GameState.ReadClue;
          draft.activeClue = [i, j];
        });
      }
      throw new Error("ClickClue action must have an associated index");
    case ActionType.SetClueWager:
      if (isClueWagerAction(action)) {
        const { userId, i, j, wager } = action.payload;
        const player = state.players.get(userId);
        const key = `${state.round},${i},${j}`;
        if (
          state.type !== GameState.WagerClue ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          state.wagers.get(key)?.has(userId) ||
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

        return produce(state, (draft) => {
          const clueWagers = draft.wagers.get(key);
          if (clueWagers) {
            clueWagers.set(userId, wager);
          } else {
            draft.wagers.set(key, new Map([[userId, wager]]));
          }

          // Read the clue once all wagers are in
          if (clueWagers?.size ?? 1 === draft.numExpectedWagers) {
            if (clue.longForm) {
              draft.type = GameState.ReadLongFormClue;
            } else {
              draft.type = GameState.ReadWagerableClue;
            }
          }
        });
      }
      throw new Error("SetClueWager action must have an associated index");
    case ActionType.Buzz:
      if (isBuzzAction(action)) {
        const { userId, i, j, deltaMs } = action.payload;
        if (
          (state.type !== GameState.ReadClue &&
            state.type !== GameState.ReadWagerableClue) ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j
        ) {
          return state;
        }

        return produce(state, (draft) => {
          // Accept this buzz if the user has not already buzzed.
          if (!draft.buzzes.has(userId)) {
            draft.buzzes.set(userId, deltaMs);
          }

          // Wait for every player to either buzz in or time out
          if (draft.buzzes.size < state.players.size) {
            return;
          }

          const winningBuzzer = getWinningBuzzer(draft.buzzes);
          if (!winningBuzzer) {
            // Reveal the answer to everyone and mark it as answered. If the clue
            // was wagerable and the player didn't buzz, deduct their wager from
            // their score.
            const board = state.game.boards.at(state.round);
            const clue = board?.categories.at(j)?.clues.at(i);
            if (clue?.wagerable) {
              const clueValue = getClueValue(state, [i, j], userId);
              const player = draft.players.get(userId);
              if (player) {
                player.score = player.score - clueValue;
              }
            }

            draft.type = GameState.RevealAnswerToAll;
            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.isAnswered = true;
            if (clue?.wagerable) {
              clueAnswer.answeredBy.set(userId, false);
            }
            draft.numAnswered += 1;
            return;
          }

          // Reveal the answer to the winning buzzer and let them evaluate its
          // correctness
          draft.type = GameState.RevealAnswerToBuzzer;
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

        return produce(state, (draft) => {
          const key = `${state.round},${i},${j}`;
          const clueAnswer =
            draft.answers.get(key) ?? new Map<string, string>();
          clueAnswer.set(userId, answer);
          draft.answers.set(key, clueAnswer);

          if (!draft.buzzes.has(userId)) {
            draft.buzzes.set(userId, 0);
          }
          if (draft.buzzes.size < state.players.size) {
            return;
          }

          // All answers are in, so show the answers to all who answered to check them.
          draft.type = GameState.RevealAnswerLongForm;
        });
      }
      throw new Error("Answer action must have an associated index and answer");
    case ActionType.Check:
      if (isCheckAction(action)) {
        const { userId, i, j, correct } = action.payload;
        const statePlayer = state.players.get(userId);
        if (
          (state.type !== GameState.RevealAnswerToBuzzer &&
            state.type !== GameState.RevealAnswerLongForm) ||
          state.activeClue?.[0] !== i ||
          state.activeClue?.[1] !== j ||
          state.isAnswered.at(state.round)?.at(i)?.at(j)?.isAnswered ||
          !statePlayer
        ) {
          return state;
        }
        const isLongForm = state.type === GameState.RevealAnswerLongForm;

        // Ignore the action if it was from a player who didn't answer the clue.
        const key = `${state.round},${i},${j}`;
        if (isLongForm) {
          const clueAnswer = state.answers.get(key);
          if (!clueAnswer || !clueAnswer.has(userId)) {
            return state;
          }
        } else {
          const winningBuzzer = getWinningBuzzer(state.buzzes);
          if (userId !== winningBuzzer?.userId) {
            return state;
          }
        }

        const clueValue = getClueValue(state, [i, j], userId);
        const newScore = correct
          ? statePlayer.score + clueValue
          : statePlayer.score - clueValue;

        const numExpectedChecks = isLongForm
          ? state.answers.get(key)?.size ?? 0
          : 1;
        const numChecks =
          (state.isAnswered.at(state.round)?.at(i)?.at(j)?.answeredBy.size ??
            0) + 1;

        // If some players have not yet checked their long-form answer, stay in
        // the current state.
        if (numChecks < numExpectedChecks) {
          return produce(state, (draft) => {
            draft.type = GameState.RevealAnswerLongForm;

            const player = draft.players.get(userId);
            if (!player) {
              return;
            }
            player.score = newScore;

            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.answeredBy.set(userId, correct);
          });
        }

        if (isLongForm) {
          return produce(state, (draft) => {
            draft.type = GameState.RevealAnswerToAll;
            const player = draft.players.get(userId);
            if (!player) {
              return;
            }
            player.score = newScore;

            // Give board control to the player with the highest score after all
            // wagers add up.
            const boardControl = Array.from(draft.players.entries()).sort(
              ([, a], [, b]) => b.score - a.score,
            )[0][0];
            draft.boardControl = boardControl;
            draft.numAnswered += 1;

            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.isAnswered = true;
            clueAnswer.answeredBy.set(userId, correct);
          });
        }

        // Reveal the answer to everyone and give the winning buzzer board
        // control.
        if (correct) {
          return produce(state, (draft) => {
            draft.type = GameState.RevealAnswerToAll;
            draft.boardControl = userId;

            const player = draft.players.get(userId);
            if (!player) {
              return;
            }
            player.score = newScore;

            draft.numAnswered += 1;
            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.isAnswered = true;
            clueAnswer.answeredBy.set(userId, correct);
          });
        }

        // New buzzes are those previously locked out plus this one.
        const buzzes = produce(state.buzzes, (draft) => {
          for (const [userId, deltaMs] of draft.entries()) {
            if (deltaMs !== CANT_BUZZ_FLAG) {
              draft.delete(userId);
            }
          }
          draft.set(userId, CANT_BUZZ_FLAG);
        });

        // If everyone has been locked out, reveal the answer to everyone.
        if (buzzes.size === state.players.size) {
          return produce(state, (draft) => {
            draft.type = GameState.RevealAnswerToAll;

            const player = draft.players.get(userId);
            if (!player) {
              return;
            }
            player.score = newScore;

            draft.numAnswered += 1;
            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.isAnswered = true;
            clueAnswer.answeredBy.set(userId, correct);
          });
        }

        // If some players have not yet been locked out, re-open the buzzers.
        return produce(state, (draft) => {
          draft.type = GameState.ReadClue;

          const player = draft.players.get(userId);
          if (!player) {
            return;
          }
          player.score = newScore;

          draft.buzzes = buzzes;
          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.answeredBy.set(userId, correct);
        });
      }
      throw new Error(
        "Check action must have an associated index and correct/incorrect",
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
            return produce(state, (draft) => {
              draft.type = GameState.GameOver;
              draft.activeClue = null;
              draft.boardControl = null;
              draft.buzzes = new Map();
              draft.numExpectedWagers = 0;
            });
          }

          // Board control goes to the player with the lowest score. In the
          // case of a tie, keep the same player in control.
          const lowestScoringPlayer = Array.from(state.players.values()).sort(
            (a, b) => a.score - b.score,
          )[0];

          let newBoardControl = lowestScoringPlayer.userId;
          if (state.boardControl) {
            const controllingPlayer = state.players.get(state.boardControl);
            if (controllingPlayer?.score === lowestScoringPlayer.score) {
              newBoardControl = controllingPlayer.userId;
            }
          }

          return produce(state, (draft) => {
            draft.type = GameState.PreviewRound;
            draft.activeClue = null;
            draft.boardControl = newBoardControl;
            draft.buzzes = new Map();
            draft.numAnswered = 0;
            draft.numCluesInBoard = getNumCluesInBoard(draft.game, newRound);
            draft.numExpectedWagers = 0;
            draft.round = newRound;
          });
        }

        return produce(state, (draft) => {
          draft.type = GameState.ShowBoard;
          draft.activeClue = null;
          draft.buzzes = new Map();
          draft.numExpectedWagers = 0;
        });
      }
      throw new Error("NextClue action must have an associated user");
  }
}
