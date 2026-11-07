import type { Draft } from "immer";
import { enableMapSet, produce } from "immer";

import type { Board, Clue } from "~/models/convert.server";
import { normalizeTeamName } from "~/models/team";
import { cyrb53 } from "~/utils";
import { isChoiceIndex, isCorrectChoice } from "~/utils/choices";

import {
  isAdjustScoreAction,
  isAdminAction,
  isAnswerAction,
  isBuzzAction,
  isCheckAction,
  isClueAction,
  isCorrectCheckAction,
  isClueWagerAction,
  isHostAction,
  isPassClueAction,
  isPlayerAction,
  isRenameTeamAction,
  isRoundAction,
  isRestoreAction,
  isSetSettingsAction,
  isSetTeamAction,
  isSkipClueAction,
  isTransferPlayerAction,
  parseHostSeat,
  parseReleaseHost,
  parseRevealAnswer,
} from "./actions";
import { isAnswerTimeSec } from "./answer-timer";
import {
  getBuzzWindowMs,
  isBuzzWindowSec,
  isFinalAnswerTimeSec,
  isReadTimeSec,
  isWagerTimeSec,
} from "./room-timers";
import { canSkipClue } from "./skip";
import {
  type CheckCorrection,
  type ClueAnswer,
  GAME_OVER_CORRECTION_GRACE_MS,
  GameState,
  type QuestionRef,
  State,
  canCorrectCheck,
  getClueValue,
  getClueValueForRound,
  getCountedChecks,
  getLastFinishedQuestion,
  getNumCluesInBoard,
  isAutoCheckedClue,
  isSecretClue,
} from "./state";

enableMapSet();

/** getNextAnswerOrder computes the next global answer order from existing clues. */
function getNextAnswerOrder(isAnswered: ClueAnswer[][][]): number {
  let max = 0;
  for (const round of isAnswered) {
    for (const row of round) {
      for (const cell of row) {
        if (cell.answerOrder > max) max = cell.answerOrder;
      }
    }
  }
  return max + 1;
}

/** getMostRecentCorrectOrder returns the highest answerOrder of a clue where
 * the given user answered correctly. Returns 0 if no correct answers found. */
function getMostRecentCorrectOrder(
  isAnswered: ClueAnswer[][][],
  userId: string,
): number {
  let max = 0;
  for (const round of isAnswered) {
    for (const row of round) {
      for (const cell of row) {
        if (cell.answeredBy.get(userId) === true && cell.answerOrder > max) {
          max = cell.answerOrder;
        }
      }
    }
  }
  return max;
}

export enum ActionType {
  Join = "join",
  /** Kick removes another player. Players may kick only before the game is
   * underway (isGameUnderway); the site admin (payload `admin: true`,
   * inserted by the server) may remove a player between questions at any
   * time. Only the server can insert kick events (RLS). */
  Kick = "kick",
  Leave = "leave",
  ChangeName = "change_name",
  StartRound = "start_round",
  ChooseClue = "choose_clue",
  SetClueWager = "set_clue_wager",
  /** PassClue gives a secret clue to another player, who answers it alone
   * (no buzzing). Only the board-control player (the chooser) may pass. */
  PassClue = "pass_clue",
  Buzz = "buzz",
  Answer = "answer",
  /** Check marks the player's answer as correct or incorrect and adds/subtracts
   * points.
   */
  Check = "check",
  CorrectCheck = "correct_check",
  NextClue = "next_clue",
  ToggleClock = "toggle_clock",
  /** TogglePause pauses or resumes the game. While paused, buzzers and clue
   * selection are disabled. Pausing is only allowed when no clue is open. */
  TogglePause = "toggle_pause",
  TransferPlayer = "transfer_player",
  /** SetTeam puts a player on a team (or takes them off it, team null).
   * Ignored while a question is open and after game over. */
  SetTeam = "set_team",
  /** RenameTeam gives the player's own team a custom name ("" resets the
   * default name). Ignored after game over. */
  RenameTeam = "rename_team",
  /** SetSettings changes the room settings (the answer timer), between
   * questions only; the last change wins. In rooms only the site admin may
   * change them (payload `admin: true`, inserted by the server); events from
   * before that rule (from a player, without the flag) stay valid. */
  SetSettings = "set_settings",
  /** SkipClue (site admin only, payload `admin: true`, inserted by the
   * server) ends the open question at once — in any state before its answer
   * is shown to everyone — or marks an unplayed question on the board as
   * played without opening it. Nobody's score changes for the skip, board
   * control stays, and the game goes on as after a normal question. */
  SkipClue = "skip_clue",
  /** AdjustScore (site admin only, payload `admin: true`, inserted by the
   * server) adds points to a player's score or sets it to an exact value,
   * any time before game over. It doesn't change the game's flow. */
  AdjustScore = "adjust_score",
  /** ClaimHost: a visitor who doesn't play takes the free host seat
   * (feature 22). Between questions, before game over. */
  ClaimHost = "claim_host",
  /** ReleaseHost: the host (or the site admin, `admin: true`) frees the host
   * seat between questions; the room goes back to self-marking. */
  ReleaseHost = "release_host",
  /** AssignHost (site admin only, `admin: true`): give the host seat to a
   * visitor who doesn't play (or the admin). Replacing a host is allowed any
   * time; filling an empty seat only between questions. */
  AssignHost = "assign_host",
  /** RevealAnswer (server only): the answer of a question resolved in host
   * mode, for players whose page doesn't have it. */
  RevealAnswer = "reveal_answer",
  /** Restore replaces the entire state (used for restoring saved solo games). */
  Restore = "restore",
}

export interface Action {
  type: ActionType;
  payload?: unknown;
  /** Epoch milliseconds from the room event (Postgres) or injected for solo play. */
  ts: number;
}

/** CLUE_TIMEOUT_MS is the default amount of time a contestant has to buzz in
 * after the clue is read, inclusive. Rooms may set another buzz window (see
 * room-timers.ts, State.buzzWindowSec); use getBuzzWindowMs(state). */
export const CLUE_TIMEOUT_MS = 5000;

/** CANT_BUZZ_FLAG means that the player buzzed in wrong, so they can't try again
 * on this clue. */
export const CANT_BUZZ_FLAG = -1;

/** Buzzes within this many milliseconds of each other are treated as ties. */
export const QUANTIZATION_FACTOR_MS = 200;

function isValidBuzz(deltaMs: number, buzzWindowMs: number): boolean {
  return deltaMs !== CANT_BUZZ_FLAG && deltaMs <= buzzWindowMs;
}

/** getTiebreakerSeed is the per-clue seed used to break buzz ties. Media
 * clues may have no text, so fall back to the answer to keep the tie order
 * varying between clues. */
export function getTiebreakerSeed(clue?: Pick<Clue, "clue" | "answer">) {
  if (!clue) return undefined;
  return clue.clue || clue.answer;
}

/** getStateTiebreakerSeed is the tiebreak seed of the active question. In
 * host mode players' pages don't have the answer (see withhold-answers), so a
 * question without text falls back to its position instead of its answer —
 * the same on every client. The mode only changes between questions. */
export function getStateTiebreakerSeed(
  state: Pick<State, "host" | "activeClue" | "round" | "game">,
) {
  if (!state.activeClue) return undefined;
  const [i, j] = state.activeClue;
  const clue = state.game.boards.at(state.round)?.categories.at(j)?.clues.at(i);
  if (!clue) return undefined;
  if (state.host) {
    return clue.clue || `${state.round},${i},${j}`;
  }
  return getTiebreakerSeed(clue);
}

/** getWinningBuzzer returns undefined if there were no valid buzzes (within
 * the room's buzz window, `buzzWindowMs`). */
export function getWinningBuzzer(
  buzzes: Map<string, number>,
  tiebreakerSeed?: string,
  buzzWindowMs: number = CLUE_TIMEOUT_MS,
):
  | {
      userId: string;
      deltaMs: number;
    }
  | undefined {
  const validBuzzes = Array.from(buzzes.entries()).filter(([, deltaMs]) =>
    isValidBuzz(deltaMs, buzzWindowMs),
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

/** getWagerRange is the smallest and largest wager a player with `score`
 * may place on a wagerable clue: the Final (long form) from $0 up to their
 * score, a Double Down from $5 up to their score or the board's highest
 * value, whichever is more. */
export function getWagerRange(
  board: Board | undefined,
  clue: Pick<Clue, "longForm">,
  score: number,
) {
  return clue.longForm
    ? { min: 0, max: score }
    : { min: 5, max: Math.max(score, getHighestClueValue(board)) };
}

function getNextBoardControl(draft: Draft<State>, userId: string) {
  const otherIds = Array.from(draft.players.keys()).filter(
    (id) => id !== userId,
  );
  otherIds.sort();
  return otherIds[0];
}

/** Transfer board control away from userId to the next player. */
function transferBoardControl(draft: Draft<State>, userId: string) {
  if (draft.boardControl !== userId) return;
  const nextBoardControl = getNextBoardControl(draft, userId);
  if (nextBoardControl) {
    draft.boardControl = nextBoardControl;
  }
}

function transferCheckCorrectionBoardControl(
  draft: Draft<State>,
  userId: string,
) {
  const correction = draft.checkCorrection;
  if (correction?.boardControlBefore !== userId) return;
  const nextBoardControl = getNextBoardControl(draft, userId);
  if (nextBoardControl) {
    correction.boardControlBefore = nextBoardControl;
  }
}

/** giveSecretClue hands the active secret clue to receiverId: they are the
 * only one who can answer (as if they had won the buzz) and everyone else is
 * locked out, so the regular reveal/check flow applies. `startedAt` is when
 * their answer turn started (for the answer timer). */
function giveSecretClue(
  draft: Draft<State>,
  receiverId: string,
  startedAt: number | null,
) {
  draft.buzzes = new Map(
    Array.from(draft.players.keys()).map((id) => [
      id,
      id === receiverId ? 0 : CANT_BUZZ_FLAG,
    ]),
  );
  draft.type = GameState.RevealAnswerToBuzzer;
  draft.answerStartedAt = startedAt;
  draft.answerTimedOut = null;
}

function getActiveClue(draft: Draft<State>) {
  if (!draft.activeClue) return undefined;
  const [i, j] = draft.activeClue;
  return draft.game.boards.at(draft.round)?.categories.at(j)?.clues.at(i);
}

/** retireFromSecretClue keeps a secret clue playable when oldUserId's guest
 * entry is retired into newUserId's (the same person, see TransferPlayer):
 * their pending answer moves to newUserId, and if only one player is left
 * while the clue is being passed, it goes to them. */
function retireFromSecretClue(
  draft: Draft<State>,
  oldUserId: string,
  newUserId: string,
  ts: number,
) {
  const clue = getActiveClue(draft);
  if (!clue || !isSecretClue(clue)) return;
  if (draft.type === GameState.PassClue) {
    const [onlyPlayer] = draft.players.keys();
    if (draft.players.size === 1 && onlyPlayer) {
      giveSecretClue(draft, onlyPlayer, ts);
    }
    return;
  }
  if (
    draft.type === GameState.RevealAnswerToBuzzer &&
    draft.buzzes.get(oldUserId) === 0
  ) {
    // The same person keeps answering: their turn (and timer) goes on.
    giveSecretClue(draft, newUserId, draft.answerStartedAt);
  }
}

/** forgetEmptyTeamNames drops the custom names of teams nobody is (or was)
 * on any more, so a team started later gets its default name. */
function forgetEmptyTeamNames(draft: Draft<State>) {
  for (const team of Array.from(draft.teamNames.keys())) {
    const hasMember = [
      ...draft.players.values(),
      ...draft.leftPlayers.values(),
    ].some((p) => p.team === team);
    if (!hasMember) {
      draft.teamNames.delete(team);
    }
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

function getCheckScoreDelta(correct: boolean | undefined, value: number) {
  if (correct === undefined) {
    return 0;
  }
  return correct ? value : -value;
}

function recordCheckCorrection(
  draft: Draft<State>,
  i: number,
  j: number,
  userId: string,
  correct: boolean,
) {
  const correction = draft.checkCorrection;
  if (
    correction &&
    correction.round === draft.round &&
    correction.i === i &&
    correction.j === j
  ) {
    correction.checks.set(userId, correct);
    return;
  }

  draft.checkCorrection = {
    round: draft.round,
    i,
    j,
    boardControlBefore: draft.boardControl,
    checks: new Map([[userId, correct]]),
  };
}

function getCorrectBoardControl(
  draft: Draft<State>,
  checks: Map<string, boolean>,
  boardControlBefore: string | null,
) {
  for (const [userId, correct] of checks) {
    // The first correct answerer may have left the game since checking, in
    // which case control must not be handed to them or no remaining player
    // could choose the next clue.
    if (correct && draft.players.has(userId)) {
      return userId;
    }
  }
  return boardControlBefore;
}

function getHighestScoringPlayerId(draft: Draft<State>) {
  return Array.from(draft.players.entries()).sort(
    ([, a], [, b]) => b.score - a.score,
  )[0]?.[0];
}

function getNextRoundBoardControl(
  draft: Draft<State>,
  fallbackBoardControl: string | null,
) {
  const sortedPlayers = Array.from(draft.players.values()).sort(
    (a, b) => a.score - b.score,
  );
  const lowestScore = sortedPlayers[0]?.score;
  if (lowestScore === undefined) {
    return fallbackBoardControl;
  }

  const tiedPlayers = sortedPlayers.filter((p) => p.score === lowestScore);
  if (tiedPlayers.length === 1) {
    return tiedPlayers[0].userId;
  }

  const tiedWithRecency = tiedPlayers
    .map((p) => ({
      userId: p.userId,
      lastCorrect: getMostRecentCorrectOrder(draft.isAnswered, p.userId),
    }))
    .sort((a, b) => b.lastCorrect - a.lastCorrect);

  if (tiedWithRecency[0].lastCorrect > 0) {
    return tiedWithRecency[0].userId;
  }
  if (
    fallbackBoardControl &&
    tiedPlayers.some((p) => p.userId === fallbackBoardControl)
  ) {
    return fallbackBoardControl;
  }
  return tiedPlayers[0].userId;
}

function applyCheckCorrection(
  draft: Draft<State>,
  correction: Draft<CheckCorrection>,
  nextChecks: Map<string, boolean>,
  longForm: boolean,
) {
  const { round, i, j } = correction;
  const clueAnswer = draft.isAnswered[round][i][j];
  const previousCountedChecks = new Map(clueAnswer.answeredBy);
  const nextCountedChecks = getCountedChecks(nextChecks, longForm);
  const affectedUserIds = new Set([
    ...previousCountedChecks.keys(),
    ...nextCountedChecks.keys(),
  ]);

  for (const userId of affectedUserIds) {
    const player = draft.players.get(userId) ?? draft.leftPlayers.get(userId);
    if (!player) {
      continue;
    }
    const clueValue = getClueValueForRound(draft, round, [i, j], userId);
    const previousDelta = getCheckScoreDelta(
      previousCountedChecks.get(userId),
      clueValue,
    );
    const nextDelta = getCheckScoreDelta(
      nextCountedChecks.get(userId),
      clueValue,
    );
    player.score += nextDelta - previousDelta;
  }

  clueAnswer.answeredBy = nextCountedChecks;
  correction.checks = nextChecks;

  const correctedClueBoardControl = longForm
    ? (getHighestScoringPlayerId(draft) ?? draft.boardControl)
    : getCorrectBoardControl(
        draft,
        nextCountedChecks,
        correction.boardControlBefore,
      );

  draft.boardControl =
    correction.round === draft.round
      ? correctedClueBoardControl
      : getNextRoundBoardControl(draft, correctedClueBoardControl);
}

/** finishBoard moves on once every question of the round was played: to
 * the next round's preview, or game over after the last round. */
function finishBoard(draft: Draft<State>, ts: number) {
  const newRound = draft.round + 1;
  const board = draft.game.boards.at(newRound);

  if (!board) {
    pauseClock(draft, ts);
    draft.type = GameState.GameOver;
    draft.activeClue = null;
    draft.boardControl = null;
    draft.buzzes = new Map();
    // The correction record survives game over so a player who was
    // mid-correction when another player advanced can still finish
    // (within GAME_OVER_CORRECTION_GRACE_MS).
    draft.gameOverAt = ts;
    draft.numExpectedWagers = 0;
    return;
  }

  // Board control goes to the player with the lowest score. In the
  // case of a tie, the player who most recently answered correctly
  // gets control. Falls back to keeping the current controller.
  const newBoardControl = getNextRoundBoardControl(draft, draft.boardControl);

  draft.type = GameState.PreviewRound;
  draft.activeClue = null;
  draft.boardControl = newBoardControl;
  draft.buzzes = new Map();
  draft.numAnswered = 0;
  draft.numCluesInBoard = getNumCluesInBoard(draft.game, newRound);
  draft.numExpectedWagers = 0;
  draft.round = newRound;
}

/** markSkipped marks question (i, j) of the current round as played and
 * skipped by the admin. */
function markSkipped(
  draft: Draft<State>,
  i: number,
  j: number,
  byHost: boolean,
) {
  const cell = draft.isAnswered[draft.round][i][j];
  cell.isAnswered = true;
  cell.skipped = true;
  if (byHost) cell.skippedByHost = true;
  cell.answerOrder = getNextAnswerOrder(draft.isAnswered);
  draft.numAnswered += 1;
}

/** getScoreAdjustmentQuestion is the question an admin score change is
 * shown with in the standings (see ScoreAdjustment): the open question, else
 * the most recently finished one. */
function getScoreAdjustmentQuestion(draft: Draft<State>): QuestionRef | null {
  if (draft.activeClue) {
    const [i, j] = draft.activeClue;
    return { round: draft.round, i, j };
  }
  return getLastFinishedQuestion(draft);
}

/** isGameUnderway is true once the first question of the game was opened:
 * from then on only the site admin may remove a player (Kick). Before that —
 * the first round's preview, or its board before anyone picked a question —
 * players may still kick each other. GameOver counts as underway. */
export function isGameUnderway(
  state: Pick<State, "type" | "round" | "numAnswered">,
) {
  return (
    (state.type !== GameState.ShowBoard &&
      state.type !== GameState.PreviewRound) ||
    state.numAnswered > 0 ||
    state.round > 0
  );
}

/** isHostId: `userId` holds the host seat. */
function isHostId(state: Pick<State, "host">, userId: string) {
  return state.host !== null && state.host.userId === userId;
}

/** mayRunFlow: in host mode only the host (their own id), or an event
 * tagged by the server for the admin or the host, starts rounds and moves
 * on from a question (feature 22). */
function mayRunFlow(
  state: Pick<State, "host">,
  action: Action,
  userId: string,
) {
  return (
    isHostId(state, userId) || isAdminAction(action) || isHostAction(action)
  );
}

/** gameEngine is the reducer (aka state machine) which implements the game. */
export function gameEngine(state: State, action: Action): State {
  // The server tags events the host made with `host: true`; without a host
  // such an event is ignored.
  if (
    action.type !== ActionType.Restore &&
    state.host === null &&
    isHostAction(action)
  ) {
    return state;
  }
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
        const { userId, name } = action.payload;
        // The host doesn't play (feature 22).
        if (isHostId(draft, userId)) {
          return;
        }
        // Seats are keyed by userId and never reset by a Join: a player who
        // is already seated keeps their seat, and one who left (or was
        // removed by the admin) during the game gets it back — score, color,
        // avatar and team. Only the name comes from the new Join.
        const seat = draft.players.get(userId) ?? draft.leftPlayers.get(userId);
        if (seat) {
          draft.leftPlayers.delete(userId);
          draft.players.set(userId, { ...seat, name });
        } else {
          const { avatar, team, ...player } = action.payload;
          draft.players.set(userId, {
            ...player,
            ...(avatar ? { avatar } : {}),
            ...(team ? { team } : {}),
            score: 0,
          });
        }
        // If this is the first player joining, give them board control.
        if (draft.players.size === 1) {
          draft.boardControl = action.payload.userId;
        }
      });
    case ActionType.Kick: {
      // Before isPlayerAction, which strips the payload to a player's fields.
      const byAdmin = isAdminAction(action);
      if (!isPlayerAction(action)) {
        throw new Error("PlayerKick action must have an associated player");
      }
      return produce(state, (draft) => {
        const { userId } = action.payload;
        if (!byAdmin) {
          // Players may only kick before the game is underway (events from
          // before the admin rule replay exactly as they did).
          if (isGameUnderway(draft)) {
            return;
          }
          // Don't allow the only player to be kicked.
          if (draft.players.size === 1) {
            return;
          }
          transferBoardControl(draft, userId);
          draft.players.delete(userId);
          forgetEmptyTeamNames(draft);
          return;
        }
        // The site admin (inserted by the server): any time the board or the
        // round preview shows, never the last player.
        const player = draft.players.get(userId);
        if (
          (draft.type !== GameState.ShowBoard &&
            draft.type !== GameState.PreviewRound) ||
          !player ||
          draft.players.size <= 1
        ) {
          return;
        }
        transferBoardControl(draft, userId);
        transferCheckCorrectionBoardControl(draft, userId);
        draft.players.delete(userId);
        if (isGameUnderway(draft)) {
          // Like leaving: the player stays on the summary with their points
          // and gets their seat back if they join again.
          draft.leftPlayers.set(userId, player);
        } else {
          forgetEmptyTeamNames(draft);
        }
      });
    }
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
        transferCheckCorrectionBoardControl(draft, action.payload.userId);
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
          // No avatar in the payload keeps the current one; "" removes it.
          const { avatar } = action.payload;
          if (avatar) {
            player.avatar = avatar;
          } else if (avatar === "") {
            delete player.avatar;
          }
        }
      });
    case ActionType.StartRound:
      if (!isRoundAction(action)) {
        throw new Error(
          "StartRound action must have an associated round number and user ID",
        );
      }
      return produce(state, (draft) => {
        // Can't start a round while paused.
        if (draft.isPaused) {
          return;
        }
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
        if (draft.host) {
          // Host mode: the host starts every round.
          if (!mayRunFlow(draft, action, userId)) {
            return;
          }
        } else if (!isSingleLongFormClue && draft.boardControl !== userId) {
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
        const { i, j } = action.payload;
        // In host mode the host may choose for the board-control player.
        const userId =
          isHostId(draft, action.payload.userId) && draft.boardControl
            ? draft.boardControl
            : action.payload.userId;
        // Can't choose a clue while paused.
        if (draft.isPaused) {
          return;
        }
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

        draft.checkCorrection = null;
        draft.answerTimedOut = null;
        draft.wagerStartedAt = null;
        draft.longFormStartedAt = null;
        resumeClock(draft, action.ts);

        if (isSecretClue(clue)) {
          draft.activeClue = [i, j];
          draft.buzzes = new Map();
          // With nobody to pass it to, the chooser answers it themselves.
          if (draft.players.size === 1 && draft.players.has(userId)) {
            giveSecretClue(draft, userId, action.ts);
            return;
          }
          draft.type = GameState.PassClue;
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
          // If no player has enough points to wager, show the clue first
          // before revealing the answer.
          if (numExpectedWagers === 0) {
            draft.type = GameState.ReadLongFormClue;
            draft.activeClue = [i, j];
            draft.buzzes = buzzes;
            draft.numExpectedWagers = 0;
            draft.longFormStartedAt = action.ts;
            return;
          }

          draft.buzzes = buzzes;
          draft.type = GameState.WagerClue;
          draft.activeClue = [i, j];
          draft.numExpectedWagers = numExpectedWagers;
          // The wager time (room setting) runs from here.
          draft.wagerStartedAt = action.ts;
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
        const { min: minWager, max: maxWager } = getWagerRange(
          board,
          clue,
          player.score,
        );

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
          draft.wagerStartedAt = null;
          if (clue.longForm) {
            draft.type = GameState.ReadLongFormClue;
            // The Final answer time (room setting) runs from here.
            draft.longFormStartedAt = action.ts;
          } else {
            draft.type = GameState.ReadWagerableClue;
          }
        }
      });
    case ActionType.PassClue:
      if (!isPassClueAction(action)) {
        throw new Error("PassClue action must have an index and a receiver");
      }
      return produce(state, (draft) => {
        const { userId, i, j, toUserId } = action.payload;
        if (
          draft.type !== GameState.PassClue ||
          draft.activeClue?.[0] !== i ||
          draft.activeClue?.[1] !== j ||
          draft.boardControl !== userId ||
          !draft.players.has(toUserId) ||
          // The chooser must give it away unless nobody else is playing.
          (toUserId === userId && draft.players.size > 1)
        ) {
          return;
        }
        resumeClock(draft, action.ts);
        giveSecretClue(draft, toUserId, action.ts);
      });
    case ActionType.Buzz:
      if (!isBuzzAction(action)) {
        throw new Error("Buzz action must have an associated index and delta");
      }
      return produce(state, (draft) => {
        const { userId, i, j, deltaMs } = action.payload;
        if (
          isHostId(draft, userId) ||
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

        const winningBuzzer = getWinningBuzzer(
          draft.buzzes,
          getStateTiebreakerSeed(draft),
          getBuzzWindowMs(draft),
        );
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
          clueAnswer.answerOrder = getNextAnswerOrder(draft.isAnswered);
          if (clue?.wagerable) {
            clueAnswer.answeredBy.set(userId, false);
          }
          draft.numAnswered += 1;
          return;
        }

        // Reveal the answer to the winning buzzer and let them evaluate its
        // correctness. Their answer turn (and answer timer) starts now.
        draft.type = GameState.RevealAnswerToBuzzer;
        draft.answerStartedAt = action.ts;
        draft.answerTimedOut = null;
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
          isHostId(draft, userId) ||
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
        draft.longFormStartedAt = null;
      });
    case ActionType.Check:
      if (!isCheckAction(action)) {
        throw new Error(
          "Check action must have an associated index and correct/incorrect",
        );
      }
      return produce(state, (draft) => {
        const { userId, i, j, choice, timedOut } = action.payload;
        let { correct } = action.payload;
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
        const autoChecked = clue !== undefined && isAutoCheckedClue(clue);

        // Host mode: the host (or the admin) judges. A player may only pick
        // an option of a multiple choice question themselves; the host's
        // device sends a timeout.
        if (
          draft.host &&
          !isHostAction(action) &&
          !isAdminAction(action) &&
          !(autoChecked && choice !== undefined && timedOut !== true)
        ) {
          return;
        }

        // Ignore the action if it was from a player who didn't answer the clue.
        const key = `${draft.round},${i},${j}`;
        if (isLongForm) {
          const clueAnswer = draft.answers.get(key);
          if (!clueAnswer || !clueAnswer.has(userId)) {
            return;
          }
        } else {
          const winningBuzzer = getWinningBuzzer(
            draft.buzzes,
            getStateTiebreakerSeed(draft),
            getBuzzWindowMs(draft),
          );
          if (userId !== winningBuzzer?.userId) {
            return;
          }
        }

        // Multiple choice: the player answers by picking an option, which is
        // checked against the answer here (every client derives the same
        // result from the game data, so a forged "correct" flag is ignored).
        if (clue && autoChecked) {
          if (
            choice === undefined &&
            timedOut === true &&
            draft.answerTimeSec > 0
          ) {
            // The player's answer time ran out before they picked: wrong,
            // with no pick.
            correct = false;
          } else {
            if (choice === undefined || !isChoiceIndex(clue, choice)) {
              return;
            }
            // In host mode players' pages don't have the answer: the check
            // route judged the pick from the game data (only the server
            // inserts room events). Self-marking rooms re-check it here.
            if (!draft.host) {
              correct = isCorrectChoice(clue, choice);
            }
            const picks =
              draft.choicePicks.get(key) ?? new Map<string, number>();
            picks.set(userId, choice);
            draft.choicePicks.set(key, picks);
          }
        }

        resumeClock(draft, action.ts);
        if (!isLongForm) {
          // The answer turn is over.
          draft.answerTimedOut =
            timedOut === true &&
            draft.answerTimeSec > 0 &&
            draft.answerStartedAt !== null
              ? { userId, startedAt: draft.answerStartedAt }
              : null;
          draft.answerStartedAt = null;
        }
        recordCheckCorrection(draft, i, j, userId, correct);

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
          draft.boardControl = getHighestScoringPlayerId(draft) ?? null;
          draft.numAnswered += 1;

          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.isAnswered = true;
          clueAnswer.answerOrder = getNextAnswerOrder(draft.isAnswered);
          clueAnswer.answeredBy.set(userId, correct);
          return;
        }

        // Reveal the answer to everyone and give the winning buzzer board
        // control. Only the receiver answers a secret clue, so it is over
        // after one check either way (and on a wrong answer board control
        // stays with the chooser).
        if (correct || (clue && isSecretClue(clue))) {
          draft.type = GameState.RevealAnswerToAll;
          player.score = newScore;
          if (correct) {
            draft.boardControl = userId;
          }

          draft.numAnswered += 1;
          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.isAnswered = true;
          clueAnswer.answerOrder = getNextAnswerOrder(draft.isAnswered);
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
          clueAnswer.answerOrder = getNextAnswerOrder(draft.isAnswered);
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
    case ActionType.CorrectCheck:
      if (!isCorrectCheckAction(action)) {
        throw new Error(
          "CorrectCheck action must have a round, index, user, and result",
        );
      }
      return produce(state, (draft) => {
        const { round, userId, i, j, correct } = action.payload;
        const correction = draft.checkCorrection;
        if (
          // Host mode: the host's (or the admin's) verdicts stand unless they
          // correct them.
          (draft.host && !isHostAction(action) && !isAdminAction(action)) ||
          !canCorrectCheck(draft.type) ||
          !correction ||
          correction.round !== round ||
          correction.i !== i ||
          correction.j !== j ||
          !draft.players.has(userId)
        ) {
          return;
        }

        // After game over, corrections are only accepted briefly — long
        // enough to finish a confirmation armed before the game ended, not
        // long enough to rewrite final results indefinitely.
        if (
          draft.type === GameState.GameOver &&
          (draft.gameOverAt === null ||
            action.ts - draft.gameOverAt > GAME_OVER_CORRECTION_GRACE_MS)
        ) {
          return;
        }

        const clue = draft.game.boards.at(round)?.categories.at(j)?.clues.at(i);
        // Multiple choice picks were checked against the answer; they are
        // final.
        if (!clue || isAutoCheckedClue(clue)) {
          return;
        }

        const countedChecks = getCountedChecks(
          correction.checks,
          Boolean(clue.longForm),
        );
        const currentCorrect = countedChecks.get(userId);
        if (currentCorrect === undefined || currentCorrect === correct) {
          return;
        }

        const nextChecks = new Map(correction.checks);
        nextChecks.set(userId, correct);
        applyCheckCorrection(
          draft,
          correction,
          nextChecks,
          Boolean(clue.longForm),
        );
        if (draft.type === GameState.GameOver) {
          draft.boardControl = null;
        }
      });
    case ActionType.NextClue:
      if (!isClueAction(action)) {
        throw new Error("NextClue action must have an associated user");
      }
      return produce(state, (draft) => {
        const { userId, i, j } = action.payload;

        // Handle NextClue from ReadLongFormClue when no one could wager:
        // transition to RevealAnswerToAll to show the answer.
        if (
          draft.type === GameState.ReadLongFormClue &&
          draft.activeClue?.[0] === i &&
          draft.activeClue?.[1] === j
        ) {
          const clue = draft.game.boards
            .at(draft.round)
            ?.categories.at(j)
            ?.clues.at(i);
          if (!clue?.longForm) return;
          if (draft.host && !mayRunFlow(draft, action, userId)) return;

          const allCantBuzz =
            draft.buzzes.size === draft.players.size &&
            Array.from(draft.buzzes.values()).every(
              (b) => b === CANT_BUZZ_FLAG,
            );
          if (!allCantBuzz) return;

          draft.type = GameState.RevealAnswerToAll;
          draft.longFormStartedAt = null;
          const clueAnswer = draft.isAnswered[draft.round][i][j];
          clueAnswer.isAnswered = true;
          clueAnswer.answerOrder = getNextAnswerOrder(draft.isAnswered);
          draft.numAnswered += 1;
          return;
        }

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
        if (draft.host) {
          // Host mode: the host moves on.
          if (!mayRunFlow(draft, action, userId)) {
            return;
          }
        } else if (!clue?.longForm && draft.boardControl !== userId) {
          return;
        }

        resumeClock(draft, action.ts);
        draft.answerTimedOut = null;

        if (draft.numAnswered === draft.numCluesInBoard) {
          finishBoard(draft, action.ts);
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
    case ActionType.TogglePause:
      return produce(state, (draft) => {
        // Can't pause or resume once the game is over.
        if (draft.type === GameState.GameOver) {
          return;
        }
        if (draft.isPaused) {
          // Resume: unpause and restart the clock.
          draft.isPaused = false;
          resumeClock(draft, action.ts);
          return;
        }
        // Pause is only allowed when no clue is open, so no live buzz window can
        // desync. Ignore the request while a clue is active.
        if (draft.activeClue !== null) {
          return;
        }
        draft.isPaused = true;
        pauseClock(draft, action.ts);
      });
    case ActionType.TransferPlayer:
      if (!isTransferPlayerAction(action)) {
        throw new Error(
          "TransferPlayer action must have oldUserId and newUserId",
        );
      }
      return produce(state, (draft) => {
        const { oldUserId, newUserId } = action.payload;

        // Don't transfer after game over.
        if (draft.type === GameState.GameOver) {
          return;
        }

        // If old user is not a current player, nothing to transfer (idempotent).
        const oldPlayer = draft.players.get(oldUserId);
        if (!oldPlayer) {
          return;
        }

        // If new user already exists in players, retire the orphaned anonymous
        // player so it doesn't block the game.
        if (draft.players.has(newUserId)) {
          transferBoardControl(draft, oldUserId);
          transferCheckCorrectionBoardControl(draft, oldUserId);
          draft.players.delete(oldUserId);
          draft.leftPlayers.set(oldUserId, oldPlayer);
          retireFromSecretClue(draft, oldUserId, newUserId, action.ts);
          return;
        }

        // Transfer the player entry.
        draft.players.delete(oldUserId);
        draft.players.set(newUserId, {
          ...oldPlayer,
          userId: newUserId,
        });

        // Transfer board control if applicable.
        if (draft.boardControl === oldUserId) {
          draft.boardControl = newUserId;
        }

        // Transfer any buzz entries for the current active clue.
        if (draft.buzzes.has(oldUserId)) {
          const buzzValue = draft.buzzes.get(oldUserId)!;
          draft.buzzes.delete(oldUserId);
          draft.buzzes.set(newUserId, buzzValue);
        }

        // Transfer wager entries.
        for (const [, wagerMap] of draft.wagers.entries()) {
          if (wagerMap.has(oldUserId)) {
            const wagerValue = wagerMap.get(oldUserId)!;
            wagerMap.delete(oldUserId);
            wagerMap.set(newUserId, wagerValue);
          }
        }

        // Transfer answer entries.
        for (const [, answerMap] of draft.answers.entries()) {
          if (answerMap.has(oldUserId)) {
            const answerValue = answerMap.get(oldUserId)!;
            answerMap.delete(oldUserId);
            answerMap.set(newUserId, answerValue);
          }
        }

        // Transfer multiple choice picks.
        for (const [, pickMap] of draft.choicePicks.entries()) {
          if (pickMap.has(oldUserId)) {
            const pickValue = pickMap.get(oldUserId)!;
            pickMap.delete(oldUserId);
            pickMap.set(newUserId, pickValue);
          }
        }

        // Transfer answeredBy entries in isAnswered.
        for (const round of draft.isAnswered) {
          for (const row of round) {
            for (const clueAnswer of row) {
              if (clueAnswer.answeredBy.has(oldUserId)) {
                const value = clueAnswer.answeredBy.get(oldUserId)!;
                clueAnswer.answeredBy.delete(oldUserId);
                clueAnswer.answeredBy.set(newUserId, value);
              }
            }
          }
        }

        // Transfer pending check-correction metadata.
        if (draft.checkCorrection) {
          if (draft.checkCorrection.boardControlBefore === oldUserId) {
            draft.checkCorrection.boardControlBefore = newUserId;
          }
          if (draft.checkCorrection.checks.has(oldUserId)) {
            draft.checkCorrection.checks = new Map(
              Array.from(draft.checkCorrection.checks.entries()).map(
                ([checkUserId, value]) => [
                  checkUserId === oldUserId ? newUserId : checkUserId,
                  value,
                ],
              ),
            );
          }
        }
      });
    case ActionType.SetTeam:
      if (!isSetTeamAction(action)) {
        throw new Error("SetTeam action must have a user and a team");
      }
      return produce(state, (draft) => {
        const { userId, team } = action.payload;
        const player = draft.players.get(userId);
        // Teams are settled between questions: changing teams while a
        // question is open would regroup the scoreboard mid-play.
        if (
          !player ||
          draft.type === GameState.GameOver ||
          draft.activeClue !== null
        ) {
          return;
        }
        if (team) {
          player.team = team;
        } else {
          delete player.team;
        }
        forgetEmptyTeamNames(draft);
      });
    case ActionType.RenameTeam:
      if (!isRenameTeamAction(action)) {
        throw new Error("RenameTeam action must have a user, team and name");
      }
      return produce(state, (draft) => {
        const { userId, team } = action.payload;
        const player = draft.players.get(userId);
        // Only a current member can rename their own team.
        if (
          !player ||
          player.team !== team ||
          draft.type === GameState.GameOver
        ) {
          return;
        }
        const name = normalizeTeamName(action.payload.name);
        if (name === undefined) {
          return;
        }
        if (name) {
          draft.teamNames.set(team, name);
        } else {
          draft.teamNames.delete(team);
        }
      });
    case ActionType.SetSettings:
      if (!isSetSettingsAction(action)) {
        throw new Error("SetSettings action must have a user and settings");
      }
      return produce(state, (draft) => {
        const {
          userId,
          answerTimeSec,
          autoWrongOnTimeout,
          readTimeSec,
          buzzWindowSec,
          finalAnswerTimeSec,
          wagerTimeSec,
          admin,
          host,
        } = action.payload;
        // The site admin (whether playing or not), or a player: solo play
        // and room events from before only the admin could change them.
        // Between questions only: a change mid-question would move the
        // running answer timer.
        if (
          (admin !== true &&
            !(host === true && isHostId(draft, userId)) &&
            !draft.players.has(userId)) ||
          draft.type === GameState.GameOver ||
          draft.activeClue !== null ||
          !isAnswerTimeSec(answerTimeSec) ||
          // Room timers: left out (older events) keeps the current value;
          // an invalid one ignores the whole change.
          (readTimeSec !== undefined && !isReadTimeSec(readTimeSec)) ||
          (buzzWindowSec !== undefined && !isBuzzWindowSec(buzzWindowSec)) ||
          (finalAnswerTimeSec !== undefined &&
            !isFinalAnswerTimeSec(finalAnswerTimeSec)) ||
          (wagerTimeSec !== undefined && !isWagerTimeSec(wagerTimeSec))
        ) {
          return;
        }
        draft.answerTimeSec = answerTimeSec;
        draft.autoWrongOnTimeout = autoWrongOnTimeout;
        if (readTimeSec !== undefined) draft.readTimeSec = readTimeSec;
        if (buzzWindowSec !== undefined) draft.buzzWindowSec = buzzWindowSec;
        if (finalAnswerTimeSec !== undefined) {
          draft.finalAnswerTimeSec = finalAnswerTimeSec;
        }
        if (wagerTimeSec !== undefined) draft.wagerTimeSec = wagerTimeSec;
      });
    case ActionType.SkipClue:
      // Ignored (not thrown) when malformed: a bad event must not break the
      // room for everyone.
      if (!isSkipClueAction(action)) {
        return state;
      }
      return produce(state, (draft) => {
        const { i, j } = action.payload;
        if (!canSkipClue(draft, i, j)) {
          return;
        }
        markSkipped(draft, i, j, isHostAction(action));

        // From the board: played without opening it.
        if (draft.type === GameState.ShowBoard) {
          if (draft.numAnswered === draft.numCluesInBoard) {
            draft.answerTimedOut = null;
            finishBoard(draft, action.ts);
          }
          return;
        }

        // The open question: show the answer to everyone, as when nobody
        // got it. Points already won or lost on it (a wrong answer before,
        // Final answers already checked) stay; the skip itself gives and
        // takes nothing, and board control stays where it was.
        draft.type = GameState.RevealAnswerToAll;
        draft.answerStartedAt = null;
        draft.answerTimedOut = null;
        draft.wagerStartedAt = null;
        draft.longFormStartedAt = null;
      });
    case ActionType.AdjustScore:
      if (!isAdjustScoreAction(action)) {
        return state;
      }
      return produce(state, (draft) => {
        const { userId, delta, score } = action.payload;
        // Final results stay final.
        if (draft.type === GameState.GameOver) {
          return;
        }
        // A player who left still counts for their team and the summary.
        const player =
          draft.players.get(userId) ?? draft.leftPlayers.get(userId);
        if (!player) {
          return;
        }
        const change = score !== undefined ? score - player.score : delta;
        if (!change) {
          return;
        }
        player.score += change;
        draft.scoreAdjustments.push({
          userId,
          delta: change,
          question: getScoreAdjustmentQuestion(draft),
          ts: action.ts,
          ...(isHostAction(action) ? { byHost: true } : {}),
        });
      });
    case ActionType.ClaimHost: {
      const seat = parseHostSeat(action);
      if (!seat) return state;
      return produce(state, (draft) => {
        if (
          draft.host !== null ||
          draft.type === GameState.GameOver ||
          draft.activeClue !== null ||
          draft.players.has(seat.userId)
        ) {
          return;
        }
        draft.host = seat;
        // Someone who left the game before it got underway isn't in it.
        if (!isGameUnderway(draft)) {
          draft.leftPlayers.delete(seat.userId);
        }
      });
    }
    case ActionType.AssignHost: {
      const seat = parseHostSeat(action);
      if (!seat || !isAdminAction(action)) return state;
      return produce(state, (draft) => {
        if (
          draft.type === GameState.GameOver ||
          draft.players.has(seat.userId) ||
          // Filling an empty seat switches to host mode: between questions.
          (draft.host === null && draft.activeClue !== null)
        ) {
          return;
        }
        draft.host = seat;
        // Someone who left the game before it got underway isn't in it.
        if (!isGameUnderway(draft)) {
          draft.leftPlayers.delete(seat.userId);
        }
      });
    }
    case ActionType.ReleaseHost: {
      const payload = parseReleaseHost(action);
      if (!payload) return state;
      return produce(state, (draft) => {
        if (
          draft.host === null ||
          draft.type === GameState.GameOver ||
          // Back to self-marking only between questions.
          draft.activeClue !== null ||
          (!isHostId(draft, payload.userId) && !isAdminAction(action))
        ) {
          return;
        }
        draft.host = null;
      });
    }
    case ActionType.RevealAnswer: {
      const reveal = parseRevealAnswer(action);
      if (!reveal) return state;
      const { round, i, j, ...answer } = reveal;
      const key = `${round},${i},${j}`;
      if (state.revealed.has(key)) return state;
      return produce(state, (draft) => {
        draft.revealed.set(key, answer);
      });
    }
    case ActionType.Restore:
      if (!isRestoreAction(action)) {
        throw new Error("Restore action must have a State payload");
      }
      return action.payload;
  }
}
