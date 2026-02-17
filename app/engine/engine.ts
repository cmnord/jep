import type { Draft } from "immer";
import { enableMapSet, produce } from "immer";

import type { Board } from "~/models/convert.server";

import { cyrb53 } from "~/utils";
import {
  isAnswerAction,
  isBuzzAction,
  isCheckAction,
  isClueAction,
  isClueWagerAction,
  isPlayerAction,
  isRoundAction,
} from "./actions";
import { GameState, State, getClueValue, getNumCluesInBoard } from "./state";

enableMapSet();

export enum ActionType {
  Join = "join",
  Kick = "kick",
  Leave = "leave",
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
  ToggleClock = "toggle_clock",
}

export interface Action {
  type: ActionType;
  payload?: unknown;
  /** Epoch milliseconds from the room event (Postgres) or injected for solo play. */
  ts: number;
}

/** CLUE_TIMEOUT_MS is the total amount of time a contestant has to buzz in after
 * the clue is read, inclusive. */
export const CLUE_TIMEOUT_MS = 5000;

/** CANT_BUZZ_FLAG means that the player buzzed in wrong, so they can't try again
 * on this clue. */
export const CANT_BUZZ_FLAG = -1;

/** Buzzes within this many milliseconds of each other are treated as ties. */
export const QUANTIZATION_FACTOR_MS = 200;

function isValidBuzz(deltaMs: number): boolean {
  return deltaMs !== CANT_BUZZ_FLAG && deltaMs <= CLUE_TIMEOUT_MS;
}

/** getWinningBuzzer returns undefined if there were no valid buzzes. */
export function getWinningBuzzer(
  buzzes: Map<string, number>,
  tiebreakerSeed?: string,
):
  | {
      userId: string;
      deltaMs: number;
    }
  | undefined {
  const validBuzzes = Array.from(buzzes.entries()).filter(([, deltaMs]) =>
    isValidBuzz(deltaMs),
  );

  if (validBuzzes.length === 0) {
    return undefined;
  }

  if (tiebreakerSeed === undefined) {
    tiebreakerSeed = "t";
    console.warn(
      "TiebreakerSeed is undefined, ties will be broken in a fixed user order.",
    );
  }
  // generate 53-bit hash, discard MSBs to get 32-bit unsigned
  const tiebreakSeed32 = cyrb53(tiebreakerSeed) >>> 0;

  const minDeltaMs = Math.min(...validBuzzes.map(([, deltaMs]) => deltaMs));

  const quantizedBuzzes: [string, number, number][] = validBuzzes.map(
    ([userId, deltaMs]) => [
      userId,
      // measure every buzz relative to the fastest one, and round to the quantization interval
      Math.floor(Math.max(0, deltaMs - minDeltaMs) / QUANTIZATION_FACTOR_MS),
      // random number derived from user ID and per-contest seed, to break ties
      cyrb53(userId, tiebreakSeed32),
    ],
  );

  const sortedBuzzes = quantizedBuzzes.sort(
    ([, qDeltaA, tiebreakA], [, qDeltaB, tiebreakB]) => {
      if (qDeltaA === qDeltaB) {
        return tiebreakA - tiebreakB;
      } else {
        return qDeltaA - qDeltaB;
      }
    },
  );

  const [userId, deltaMs] = sortedBuzzes[0];
  return { userId, deltaMs };
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

/** Transfer board control away from userId to the next player. */
function transferBoardControl(draft: Draft<State>, userId: string) {
  if (draft.boardControl !== userId) return;
  const otherIds = Array.from(draft.players.keys()).filter(
    (id) => id !== userId,
  );
  otherIds.sort();
  if (otherIds.length > 0) {
    draft.boardControl = otherIds[0];
  }
}

/** parseUtcMs converts an ISO timestamp string to epoch milliseconds,
 * treating timezone-naive strings (from Postgres) as UTC. */
export function parseUtcMs(ts: string): number {
  if (/Z|[+-]\d{2}(:\d{2})?$/.test(ts)) return new Date(ts).getTime();
  return new Date(ts + "Z").getTime();
}

/** resumeClock sets the clock to running, recording when it was resumed.
 * No-op if already running. */
function resumeClock(draft: Draft<State>, ts: number) {
  if (draft.clockRunning) return;
  draft.clockRunning = true;
  draft.clockLastResumedAt = ts;
}

/** pauseClock accumulates elapsed time and marks the clock as paused.
 * No-op if already paused. */
function pauseClock(draft: Draft<State>, ts: number) {
  if (!draft.clockRunning || draft.clockLastResumedAt === null) return;
  const elapsed = ts - draft.clockLastResumedAt;
  draft.clockAccumulatedMs += Math.max(0, elapsed);
  draft.clockRunning = false;
  draft.clockLastResumedAt = null;
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
    case ActionType.Kick:
      if (!isPlayerAction(action)) {
        throw new Error("PlayerKick action must have an associated player");
      }
      return produce(state, (draft) => {
        // Don't kick players after the game has started.
        if (
          (draft.type !== GameState.ShowBoard &&
            draft.type !== GameState.PreviewRound) ||
          draft.numAnswered > 0 ||
          draft.round > 0
        ) {
          return;
        }
        // Don't allow the only player to be kicked.
        if (draft.players.size === 1) {
          return;
        }
        transferBoardControl(draft, action.payload.userId);
        draft.players.delete(action.payload.userId);
      });
    case ActionType.Leave:
      if (!isPlayerAction(action)) {
        throw new Error("PlayerLeave action must have an associated player");
      }
      return produce(state, (draft) => {
        // Only allow leaving when viewing the board or round preview.
        if (
          draft.type !== GameState.ShowBoard &&
          draft.type !== GameState.PreviewRound
        ) {
          return;
        }
        const player = draft.players.get(action.payload.userId);
        if (!player) {
          return;
        }
        // Don't allow the last player to leave.
        if (draft.players.size <= 1) {
          return;
        }
        transferBoardControl(draft, action.payload.userId);
        // Move to leftPlayers so they appear in post-game review.
        draft.players.delete(action.payload.userId);
        draft.leftPlayers.set(action.payload.userId, player);
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
        if (round != draft.round) {
          return;
        }
        // Any player can start the final round.
        const board = draft.game.boards[draft.round];
        const isSingleLongFormClue =
          board.categories.length === 1 &&
          board.categories[0].clues.length === 1 &&
          board.categories[0].clues[0].longForm;
        if (!isSingleLongFormClue && draft.boardControl !== userId) {
          return;
        }

        draft.type = GameState.ShowBoard;
        resumeClock(draft, action.ts);
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

        resumeClock(draft, action.ts);

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

        resumeClock(draft, action.ts);

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

        resumeClock(draft, action.ts);

        // Accept this buzz if the user has not already buzzed.
        if (!draft.buzzes.has(userId)) {
          draft.buzzes.set(userId, deltaMs);
        }

        // Wait for every player to either buzz in or time out
        if (draft.buzzes.size < draft.players.size) {
          return;
        }

        const board = draft.game.boards.at(draft.round);
        const clue = board?.categories.at(j)?.clues.at(i);

        const winningBuzzer = getWinningBuzzer(draft.buzzes, clue?.clue);
        if (!winningBuzzer) {
          // Reveal the answer to everyone and mark it as answered. If the clue
          // was wagerable and the player didn't buzz, deduct their wager from
          // their score.
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

        resumeClock(draft, action.ts);

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

        const board = draft.game.boards.at(draft.round);
        const clue = board?.categories.at(j)?.clues.at(i);
        const clueText = clue?.clue;

        // Ignore the action if it was from a player who didn't answer the clue.
        const key = `${draft.round},${i},${j}`;
        if (isLongForm) {
          const clueAnswer = draft.answers.get(key);
          if (!clueAnswer || !clueAnswer.has(userId)) {
            return;
          }
        } else {
          const winningBuzzer = getWinningBuzzer(draft.buzzes, clueText);
          if (userId !== winningBuzzer?.userId) {
            return;
          }
        }

        resumeClock(draft, action.ts);

        const clueValue = getClueValue(draft, [i, j], userId);
        const newScore = correct
          ? player.score + clueValue
          : player.score - clueValue;

        const numExpectedChecks = isLongForm
          ? (draft.answers.get(key)?.size ?? 0)
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
        const buzzes = new Map(draft.buzzes);
        for (const [userId, deltaMs] of buzzes.entries()) {
          if (deltaMs !== CANT_BUZZ_FLAG) {
            buzzes.delete(userId);
          }
        }
        buzzes.set(userId, CANT_BUZZ_FLAG);

        // If everyone has been locked out, reveal the answer to everyone.
        if (buzzes.size === draft.players.size) {
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

        resumeClock(draft, action.ts);

        if (draft.numAnswered === draft.numCluesInBoard) {
          const newRound = draft.round + 1;
          const board = draft.game.boards.at(newRound);

          if (!board) {
            pauseClock(draft, action.ts);
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
    case ActionType.ToggleClock:
      return produce(state, (draft) => {
        if (draft.type === GameState.GameOver) {
          return;
        }
        if (draft.clockRunning) {
          pauseClock(draft, action.ts);
        } else {
          resumeClock(draft, action.ts);
        }
      });
  }
}
