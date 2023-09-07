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
      if (!isPlayerAction(action)) {
        throw new Error("PlayerJoin action must have an associated player");
      }
      return produce(state, (draft) => {
        // Don't add players after the game is over.
        if (draft.type === GameState.GameOver) {
          return;
        }
        draft.players.set(action.payload.userId, {
          ...action.payload,
          score: 0,
        });
        // If this is the first player joining, give them board control.
        if (draft.players.size === 1) {
          draft.boardControl = action.payload.userId;
        }
      });
    case ActionType.ChangeName:
      if (!isPlayerAction(action)) {
        throw new Error(
          "PlayerChangeName action must have an associated player",
        );
      }
      return produce(state, (draft) => {
        const player = draft.players.get(action.payload.userId);
        // Player must already exist to change name
        if (player) {
          player.name = action.payload.name;
        }
      });
    case ActionType.StartRound:
      if (!isRoundAction(action)) {
        throw new Error(
          "StartRound action must have an associated round number and user ID",
        );
      }
      return produce(state, (draft) => {
        // Game cannot start without any players
        if (draft.type !== GameState.PreviewRound || draft.players.size === 0) {
          return;
        }
        const { round, userId } = action.payload;
        if (draft.boardControl !== userId || round !== draft.round) {
          return;
        }

        draft.type = GameState.ShowBoard;
      });
    case ActionType.ChooseClue:
      if (!isClueAction(action)) {
        throw new Error("ClickClue action must have an associated index");
      }
      return produce(state, (draft) => {
        const { userId, i, j } = action.payload;
        if (
          draft.type !== GameState.ShowBoard ||
          draft.isAnswered.at(draft.round)?.at(i)?.at(j)?.isAnswered
        ) {
          return;
        }
        // Any player can choose the final clue.
        const board = draft.game.boards[draft.round];
        const isSingleLongFormClue =
          board.categories.length === 1 &&
          board.categories[0].clues.length === 1 &&
          board.categories[0].clues[0].longForm;
        if (!isSingleLongFormClue && draft.boardControl !== userId) {
          return;
        }
        const clue = draft.game.boards
          .at(draft.round)
          ?.categories.at(j)
          ?.clues.at(i);
        if (!clue) {
          return;
        }

        if (clue.wagerable) {
          // If long-form, anyone with a positive score can buzz. If not, only the
          // player with board control can buzz.
          if (!clue.longForm && draft.boardControl !== userId) {
            return;
          }
          const allPlayers = Array.from(draft.players.entries());
          const buzzes = clue.longForm
            ? new Map(
                allPlayers
                  .filter(([, p]) => p.score <= 0)
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG]),
              )
            : new Map(
                allPlayers
                  .filter(([pUserId]) => pUserId !== draft.boardControl)
                  .map(([pUserId]) => [pUserId, CANT_BUZZ_FLAG]),
              );

          const numExpectedWagers = draft.players.size - buzzes.size;
          // If no player has enough points to wager, just show the clue.
          if (numExpectedWagers === 0) {
            draft.type = GameState.RevealAnswerToAll;
            draft.activeClue = [i, j];
            const clueAnswer = draft.isAnswered[draft.round][i][j];
            clueAnswer.isAnswered = true;
            draft.numAnswered += 1;
            return;
          }

          draft.buzzes = buzzes;
          draft.type = GameState.WagerClue;
          draft.activeClue = [i, j];
          draft.numExpectedWagers = numExpectedWagers;
          return;
        }

        draft.type = GameState.ReadClue;
        draft.activeClue = [i, j];
      });
    case ActionType.SetClueWager:
      if (!isClueWagerAction(action)) {
        throw new Error("SetClueWager action must have an associated index");
      }
      return produce(state, (draft) => {
        const { userId, i, j, wager } = action.payload;
        const player = draft.players.get(userId);
        const key = `${draft.round},${i},${j}`;
        if (
          draft.type !== GameState.WagerClue ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j ||
          draft.wagers.get(key)?.has(userId) ||
          !player
        ) {
          return;
        }

        const board = draft.game.boards.at(draft.round);
        const clue = board?.categories.at(j)?.clues.at(i);
        if (!clue) {
          return;
        }

        // Validate wager amount
        const minWager = clue.longForm ? 0 : 5;
        const highestClueValue = getHighestClueValue(board);
        const maxWager = clue.longForm
          ? player.score
          : Math.max(player.score, highestClueValue);

        if (wager < minWager) {
          throw new Error(`Wager must be at least $${minWager}`);
        } else if (wager > maxWager) {
          throw new Error(`Wager must be at most $${maxWager}`);
        }

        const clueWagers = draft.wagers.get(key);
        if (clueWagers) {
          clueWagers.set(userId, wager);
        } else {
          draft.wagers.set(key, new Map([[userId, wager]]));
        }

        // Read the clue once all wagers are in
        const numWagersIn = clueWagers?.size ?? 1;
        if (numWagersIn === draft.numExpectedWagers) {
          if (clue.longForm) {
            draft.type = GameState.ReadLongFormClue;
          } else {
            draft.type = GameState.ReadWagerableClue;
          }
        }
      });
    case ActionType.Buzz:
      if (!isBuzzAction(action)) {
        throw new Error("Buzz action must have an associated index and delta");
      }
      return produce(state, (draft) => {
        const { userId, i, j, deltaMs } = action.payload;
        if (
          (draft.type !== GameState.ReadClue &&
            draft.type !== GameState.ReadWagerableClue) ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j
        ) {
          return;
        }

        // Accept this buzz if the user has not already buzzed.
        if (!draft.buzzes.has(userId)) {
          draft.buzzes.set(userId, deltaMs);
        }

        // Wait for every player to either buzz in or time out
        if (draft.buzzes.size < draft.players.size) {
          return;
        }

        const winningBuzzer = getWinningBuzzer(draft.buzzes);
        if (!winningBuzzer) {
          // Reveal the answer to everyone and mark it as answered. If the clue
          // was wagerable and the player didn't buzz, deduct their wager from
          // their score.
          const board = draft.game.boards.at(draft.round);
          const clue = board?.categories.at(j)?.clues.at(i);
          if (clue?.wagerable) {
            const clueValue = getClueValue(draft, [i, j], userId);
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
    case ActionType.Answer:
      if (!isAnswerAction(action)) {
        throw new Error(
          "Answer action must have an associated index and answer",
        );
      }
      return produce(state, (draft) => {
        const { userId, i, j, answer } = action.payload;
        if (
          draft.type !== GameState.ReadLongFormClue ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j ||
          draft.buzzes.get(userId) === CANT_BUZZ_FLAG
        ) {
          return;
        }

        const key = `${draft.round},${i},${j}`;
        const clueAnswer = draft.answers.get(key) ?? new Map<string, string>();
        clueAnswer.set(userId, answer);
        draft.answers.set(key, clueAnswer);

        if (!draft.buzzes.has(userId)) {
          draft.buzzes.set(userId, 0);
        }
        if (draft.buzzes.size < draft.players.size) {
          return;
        }

        // All answers are in, so show the answers to all who answered to check them.
        draft.type = GameState.RevealAnswerLongForm;
      });
    case ActionType.Check:
      if (!isCheckAction(action)) {
        throw new Error(
          "Check action must have an associated index and correct/incorrect",
        );
      }
      return produce(state, (draft) => {
        const { userId, i, j, correct } = action.payload;
        const player = draft.players.get(userId);
        if (
          (draft.type !== GameState.RevealAnswerToBuzzer &&
            draft.type !== GameState.RevealAnswerLongForm) ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j ||
          draft.isAnswered.at(draft.round)?.at(i)?.at(j)?.isAnswered ||
          !player
        ) {
          return;
        }
        const isLongForm = draft.type === GameState.RevealAnswerLongForm;

        // Ignore the action if it was from a player who didn't answer the clue.
        const key = `${draft.round},${i},${j}`;
        if (isLongForm) {
          const clueAnswer = draft.answers.get(key);
          if (!clueAnswer || !clueAnswer.has(userId)) {
            return;
          }
        } else {
          const winningBuzzer = getWinningBuzzer(draft.buzzes);
          if (userId !== winningBuzzer?.userId) {
            return;
          }
        }

        const clueValue = getClueValue(draft, [i, j], userId);
        const newScore = correct
          ? player.score + clueValue
          : player.score - clueValue;

        const numExpectedChecks = isLongForm
          ? draft.answers.get(key)?.size ?? 0
          : 1;
        const numChecks =
          (draft.isAnswered.at(draft.round)?.at(i)?.at(j)?.answeredBy.size ??
            0) + 1;

        // If some players have not yet checked their long-form answer, stay in
        // the current state.
        if (numChecks < numExpectedChecks) {
          draft.type = GameState.RevealAnswerLongForm;
          player.score = newScore;

          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.answeredBy.set(userId, correct);
          return;
        }

        if (isLongForm) {
          draft.type = GameState.RevealAnswerToAll;
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
          return;
        }

        // Reveal the answer to everyone and give the winning buzzer board
        // control.
        if (correct) {
          draft.type = GameState.RevealAnswerToAll;
          player.score = newScore;
          draft.boardControl = userId;

          draft.numAnswered += 1;
          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.isAnswered = true;
          clueAnswer.answeredBy.set(userId, correct);
          return;
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
          draft.type = GameState.RevealAnswerToAll;
          player.score = newScore;

          draft.numAnswered += 1;
          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.isAnswered = true;
          clueAnswer.answeredBy.set(userId, correct);
          return;
        }

        // If some players have not yet been locked out, re-open the buzzers.
        draft.type = GameState.ReadClue;
        player.score = newScore;

        draft.buzzes = buzzes;
        const clueAnswer = draft.isAnswered[draft.round][i][j];
        clueAnswer.answeredBy.set(userId, correct);
      });
    case ActionType.NextClue:
      if (!isClueAction(action)) {
        throw new Error("NextClue action must have an associated user");
      }
      return produce(state, (draft) => {
        const { userId, i, j } = action.payload;
        // Ignore this action if the clue is no longer active or the player does
        // not have board control.
        if (
          draft.type !== GameState.RevealAnswerToAll ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j
        ) {
          return;
        }
        const clue = draft.game.boards
          .at(draft.round)
          ?.categories.at(j)
          ?.clues.at(i);
        if (!clue?.longForm && draft.boardControl !== userId) {
          return;
        }

        if (draft.numAnswered === draft.numCluesInBoard) {
          const newRound = draft.round + 1;
          const board = draft.game.boards.at(newRound);

          if (!board) {
            draft.type = GameState.GameOver;
            draft.activeClue = null;
            draft.boardControl = null;
            draft.buzzes = new Map();
            draft.numExpectedWagers = 0;
            return;
          }

          // Board control goes to the player with the lowest score. In the
          // case of a tie, keep the same player in control.
          const lowestScoringPlayer = Array.from(draft.players.values()).sort(
            (a, b) => a.score - b.score,
          )[0];

          let newBoardControl = lowestScoringPlayer.userId;
          if (draft.boardControl) {
            const controllingPlayer = draft.players.get(draft.boardControl);
            if (controllingPlayer?.score === lowestScoringPlayer.score) {
              newBoardControl = controllingPlayer.userId;
            }
          }

          draft.type = GameState.PreviewRound;
          draft.activeClue = null;
          draft.boardControl = newBoardControl;
          draft.buzzes = new Map();
          draft.numAnswered = 0;
          draft.numCluesInBoard = getNumCluesInBoard(draft.game, newRound);
          draft.numExpectedWagers = 0;
          draft.round = newRound;
          return;
        }

        draft.type = GameState.ShowBoard;
        draft.activeClue = null;
        draft.buzzes = new Map();
        draft.numExpectedWagers = 0;
      });
  }
}
