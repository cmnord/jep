import type { Avatar } from "~/models/avatar";
import type { Board, Clue, Game } from "~/models/convert.server";
import type { PlayerColor } from "~/models/player-color";
import type { TeamId } from "~/models/team";
import { hasChoices } from "~/utils/choices";
import type { MediaBlock } from "~/utils/media";

import { DEFAULT_AUTO_WRONG_ON_TIMEOUT } from "./answer-timer";
import { DEFAULT_ROOM_TIMERS } from "./room-timers";

/** UNREVEALED_PLACEHOLDER is used when a field was not revealed in the game
 * playthrough.
 */
const UNREVEALED_PLACEHOLDER = "***unrevealed***";
/** MISSING_PLACEHOLDER is used when a field was not recorded. */
const MISSING_PLACEHOLDER = "***missing***";

export enum GameState {
  PreviewRound = "PreviewRound",
  ShowBoard = "ShowBoard",
  WagerClue = "WagerClue",
  /** A secret clue was chosen: the board-control player must give it to
   * another player (see ActionType.PassClue). */
  PassClue = "PassClue",
  ReadClue = "ReadClue",
  ReadWagerableClue = "ReadWagerableClue",
  ReadLongFormClue = "ReadLongFormClue",
  RevealAnswerToBuzzer = "RevealAnswerToBuzzer",
  RevealAnswerLongForm = "RevealAnswerLongForm",
  RevealAnswerToAll = "RevealAnswerToAll",
  GameOver = "GameOver",
}

export interface ClueAnswer {
  isAnswered: boolean;
  answeredBy: Map<string, boolean>;
  /** Global order in which this clue was answered. 0 = unanswered. */
  answerOrder: number;
  /** The site admin skipped this question (ActionType.SkipClue): it counts
   * as played, without points for anyone for the skip itself. */
  skipped?: boolean;
  /** The room's host (not the site admin) skipped it (feature 22). */
  skippedByHost?: boolean;
}

/** QuestionRef names a question of the game: round and board cell. */
export interface QuestionRef {
  round: number;
  i: number;
  j: number;
}

/** ScoreAdjustment is a score change made by the site admin
 * (ActionType.AdjustScore). */
export interface ScoreAdjustment {
  userId: string;
  /** The change (an exact score set by the admin is stored as the
   * difference). Never 0. */
  delta: number;
  /** The question the change is shown with in the standings: the open
   * question, else the most recently finished one, else null (before any
   * question). See getScoreChanges in standings.ts. */
  question: QuestionRef | null;
  ts: number;
  /** The room's host (not the site admin) made the change (feature 22). */
  byHost?: boolean;
}

export interface CheckCorrection {
  round: number;
  i: number;
  j: number;
  boardControlBefore: string | null;
  checks: Map<string, boolean>;
}

export interface PlayerCheckCorrection {
  round: number;
  i: number;
  j: number;
  correct: boolean;
  value: number;
}

export interface Player {
  userId: string;
  name: string;
  score: number;
  /** CSS hex color chosen by the player (e.g. #7a8ae0). */
  color?: PlayerColor;
  /** Emoji or small photo chosen by the player (see models/avatar.ts). */
  avatar?: Avatar;
  /** The player's team (team mode, see models/team.ts). No team plays solo. */
  team?: TeamId;
}

/** Host is the holder of the room's host seat (feature 22, SIGame's
 * "showman"): not a player — no score, no buzzing — who sees the answers,
 * judges the players' spoken answers and runs the game. */
export interface Host {
  userId: string;
  name: string;
  avatar?: Avatar;
}

/** RevealedAnswer is the answer of a question resolved in host mode, sent by
 * the server in a reveal_answer event: players' pages don't get answers of
 * unresolved questions (see models/withhold-answers.ts). */
export interface RevealedAnswer {
  answer: string;
  answerMedia?: MediaBlock[];
}

export function clueIsPlayable(clue: Clue) {
  const clueText = clue.clue.toLowerCase();
  return (
    clueText !== MISSING_PLACEHOLDER && clueText !== UNREVEALED_PLACEHOLDER
  );
}

/** RoundIJKey is a string in the format of `round,i,j`. */
type RoundIJKey = string;

export interface State {
  // per game state
  readonly type: GameState;
  readonly answers: Map<RoundIJKey, Map<string, string>>;
  /** Options picked on multiple choice clues: userId -> option index. */
  readonly choicePicks: Map<RoundIJKey, Map<string, number>>;
  readonly boardControl: string | null;
  readonly game: Game;
  /** Active players in the game. */
  readonly players: Map<string, Player>;
  /** Players who voluntarily left mid-game. Preserved for post-game review. */
  readonly leftPlayers: Map<string, Player>;
  readonly wagers: Map<RoundIJKey, Map<string, number>>;
  readonly isAnswered: ClueAnswer[][][];
  readonly checkCorrection: CheckCorrection | null;
  /** Custom team names set by a member (teams without one use their default,
   * translated name). Older saved solo states have none. */
  readonly teamNames: Map<TeamId, string>;
  /** Score changes made by the site admin, oldest first (rooms only: solo
   * play has no admin). */
  readonly scoreAdjustments: ScoreAdjustment[];
  /** The host seat (feature 22): null plays the self-marking game. Solo
   * play never has a host. */
  readonly host: Host | null;
  /** Answers revealed by the server (reveal_answer events) of questions
   * resolved in host mode, by `round,i,j`. */
  readonly revealed: Map<RoundIJKey, RevealedAnswer>;

  // per round state
  readonly activeClue: [number, number] | null;
  readonly numAnswered: number;
  readonly numCluesInBoard: number;
  readonly round: number;

  // per clue state
  readonly buzzes: Map<string, number>;
  readonly numExpectedWagers: number;

  /** When the game ended, for bounding post-game corrections. */
  readonly gameOverAt: number | null;

  // clock state
  readonly clockRunning: boolean;
  readonly clockAccumulatedMs: number;
  readonly clockLastResumedAt: number | null;

  /** Whether the game is paused. Buzzers and clue selection are disabled while
   * paused. Pausing is only allowed when no clue is open (see engine.ts). */
  readonly isPaused: boolean;

  // answer timer (room setting, see answer-timer.ts and ActionType.SetSettings)
  /** Seconds the answering player has to answer and mark it; 0 = off. Older
   * saved solo states have none. */
  readonly answerTimeSec: number;
  /** Whether the answering player's own device marks the answer wrong when
   * their time runs out. */
  readonly autoWrongOnTimeout: boolean;
  /** When the current answer turn (RevealAnswerToBuzzer) started: the
   * timestamp of the event that gave the player their turn. null outside an
   * answer turn (and for a turn restored from a solo save). */
  readonly answerStartedAt: number | null;
  /** The last answer turn on the active clue ran out of time (the player's
   * device sent a timed-out check), so everyone can be told "Time's up!"
   * after the question moves on. Cleared when the next turn starts. */
  readonly answerTimedOut: { userId: string; startedAt: number } | null;

  // room timers (room settings, see room-timers.ts). Older saved solo states
  // and rooms without such settings use DEFAULT_ROOM_TIMERS.
  /** Seconds the question is "read" before the buzzers open; null = Auto
   * (from the question's text and media, or its pack hint). */
  readonly readTimeSec: number | null;
  /** Seconds players have to buzz in once the buzzers open. */
  readonly buzzWindowSec: number;
  /** Seconds to write the Final (long-form) answer. */
  readonly finalAnswerTimeSec: number;
  /** Seconds to place a wager; 0 = unlimited. */
  readonly wagerTimeSec: number;
  /** When the current wager step (WagerClue) started: the timestamp of the
   * event that opened it. null outside it. */
  readonly wagerStartedAt: number | null;
  /** When the current Final answer step (ReadLongFormClue) started. null
   * outside it. */
  readonly longFormStartedAt: number | null;
}

/** stateFromGame creates a new initial state based on the game. */
export function stateFromGame(game: Game) {
  const state: State = {
    type: GameState.PreviewRound,
    activeClue: null,
    answers: new Map(),
    choicePicks: new Map(),
    boardControl: null,
    buzzes: new Map(),
    game,
    round: 0,
    isAnswered: [],
    checkCorrection: null,
    teamNames: new Map(),
    scoreAdjustments: [],
    host: null,
    revealed: new Map(),
    numAnswered: 0,
    numCluesInBoard: getNumCluesInBoard(game, 0),
    numExpectedWagers: 0,
    players: new Map(),
    leftPlayers: new Map(),
    wagers: new Map(),
    gameOverAt: null,
    clockRunning: false,
    clockAccumulatedMs: 0,
    clockLastResumedAt: null,
    isPaused: false,
    answerTimeSec: 0,
    autoWrongOnTimeout: DEFAULT_AUTO_WRONG_ON_TIMEOUT,
    answerStartedAt: null,
    answerTimedOut: null,
    ...DEFAULT_ROOM_TIMERS,
    wagerStartedAt: null,
    longFormStartedAt: null,
  };

  for (let round = 0; round < game.boards.length; round++) {
    state.isAnswered[round] = newAnswerGrid(game.boards[round]);
  }

  return state;
}

/** isHostMode: someone holds the host seat, so the host judges the answers
 * (feature 22). Without a host the players mark their own answers. */
export function isHostMode(state: Pick<State, "host">) {
  return state.host !== null;
}

/** getBoardSize is the [rows, columns] of a board's grid. Categories may have
 * different numbers of clues, so there are as many rows as the longest
 * category has clues; shorter categories leave empty cells at the bottom. */
export function getBoardSize(board: Board): [number, number] {
  const numRows = Math.max(0, ...board.categories.map((c) => c.clues.length));
  return [numRows, board.categories.length];
}

/** newAnswerGrid creates the unanswered isAnswered grid for a board, with a
 * cell for every (row, column) of the grid, including empty cells of shorter
 * categories (which are never answered). */
export function newAnswerGrid(board: Board): ClueAnswer[][] {
  const [numRows, numCols] = getBoardSize(board);
  return Array.from({ length: numRows }, () =>
    Array.from(
      { length: numCols },
      (): ClueAnswer => ({
        isAnswered: false,
        answeredBy: new Map(),
        answerOrder: 0,
      }),
    ),
  );
}

/** getLastFinishedQuestion is the most recently finished question (highest
 * answer order, in any round), or null before any. */
export function getLastFinishedQuestion(
  state: Pick<State, "isAnswered">,
): QuestionRef | null {
  let best: QuestionRef | null = null;
  let bestOrder = 0;
  state.isAnswered.forEach((rows, round) =>
    rows.forEach((row, i) =>
      row.forEach((cell, j) => {
        if (cell.isAnswered && cell.answerOrder > bestOrder) {
          bestOrder = cell.answerOrder;
          best = { round, i, j };
        }
      }),
    ),
  );
  return best;
}

/** getPlayer looks up a player in both active and left player maps. */
export function getPlayer(state: State, userId: string): Player | undefined {
  return state.players.get(userId) ?? state.leftPlayers.get(userId);
}

export function getCountedChecks(
  checks: Map<string, boolean>,
  longForm: boolean,
) {
  if (longForm) {
    return new Map(checks);
  }

  const counted = new Map<string, boolean>();
  for (const [userId, correct] of checks) {
    counted.set(userId, correct);
    if (correct) {
      break;
    }
  }
  return counted;
}

/** isAutoCheckedClue is true for multiple choice clues, whose picks are
 * checked against the answer instead of by the player. Long-form clues never
 * have choices (rejected by the game schema). */
export function isAutoCheckedClue(clue: Clue) {
  return hasChoices(clue) && !clue.longForm;
}

/** isSecretClue is true for secret ("cat in the bag") clues, which the
 * chooser hands to another player instead of opening the buzzers. Secret
 * clues are never wagerable or long-form (rejected by the game schema); such
 * clues play as their wagerable kind. */
export function isSecretClue(clue: Clue) {
  return Boolean(clue.secret) && !clue.wagerable && !clue.longForm;
}

/** getSecretTopic is the topic shown when a secret clue is handed over: its
 * own secretTopic or else the category name. */
export function getSecretTopic(board: Board, [i, j]: [number, number]) {
  const clue = board.categories.at(j)?.clues.at(i);
  return clue?.secretTopic ?? board.categoryNames.at(j) ?? "";
}

/** Corrections are allowed in any state where the answer is public and the
 * next clue hasn't been chosen: the reveal screens, the board, and the
 * round preview (the last clue of a round transitions straight to the next
 * round's preview, and the correction window shouldn't have a hole in it).
 * This keeps corrections score-only — the clue can never return to live
 * play.
 */
/** How long after game over the final clue's checks may still be
 * corrected. The armed-confirmation carry-over is client-local, so the
 * engine bounds the window by time instead: long enough to finish an
 * in-flight confirmation, short enough that final results stay final.
 */
export const GAME_OVER_CORRECTION_GRACE_MS = 60_000;

export function canCorrectCheck(type: GameState) {
  return (
    type === GameState.RevealAnswerToAll ||
    type === GameState.RevealAnswerLongForm ||
    type === GameState.ShowBoard ||
    type === GameState.PreviewRound ||
    type === GameState.GameOver
  );
}

export function getCheckCorrectionForPlayer(
  state: State,
  userId: string,
): PlayerCheckCorrection | undefined {
  const correction = state.checkCorrection;
  if (!canCorrectCheck(state.type) || !correction) {
    return undefined;
  }
  const { round, i, j, checks } = correction;

  const clue = state.game.boards.at(round)?.categories.at(j)?.clues.at(i);
  // Multiple choice picks are checked automatically, so they can't be undone.
  if (!clue || isAutoCheckedClue(clue)) {
    return undefined;
  }

  const countedChecks = getCountedChecks(checks, Boolean(clue.longForm));
  const correct = countedChecks.get(userId);
  if (correct === undefined) {
    return undefined;
  }

  return {
    round,
    i,
    j,
    correct,
    value: getClueValueForRound(state, round, [i, j], userId),
  };
}

export function getClueValueForRound(
  state: Pick<State, "game" | "wagers">,
  round: number,
  [i, j]: [number, number],
  userId: string,
) {
  const board = state.game.boards.at(round);
  const clue = board?.categories.at(j)?.clues.at(i);
  if (!clue) {
    throw new Error(`No clue exists at (${i}, ${j}) in round ${round}`);
  }
  if (clue.wagerable) {
    const key = `${round},${i},${j}`;
    const wagers = state.wagers.get(key);
    return wagers?.get(userId) ?? 0;
  }
  if (isSecretClue(clue)) {
    return clue.secretValue ?? clue.value;
  }
  return clue.value;
}

/** getClueValue gets the clue's wagered value if it's wagerable and its value
 * on the current board otherwise.
 */
export function getClueValue(
  state: State,
  [i, j]: [number, number],
  userId: string,
) {
  return getClueValueForRound(state, state.round, [i, j], userId);
}

/** getNumCluesInBoard gets the number of clues in that round of the game.
 */
export function getNumCluesInBoard(game: Game, round: number) {
  const board = game.boards.at(round);
  if (!board) {
    return 0;
  }
  return board.categories.reduce(
    (acc, category) =>
      (acc += category.clues.filter((c) => clueIsPlayable(c)).length),
    0,
  );
}
