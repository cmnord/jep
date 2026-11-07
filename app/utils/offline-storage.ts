import {
  DEFAULT_AUTO_WRONG_ON_TIMEOUT,
  isAnswerTimeSec,
} from "~/engine/answer-timer";
import {
  DEFAULT_ROOM_TIMERS,
  isBuzzWindowSec,
  isFinalAnswerTimeSec,
  isReadTimeSec,
  isWagerTimeSec,
} from "~/engine/room-timers";
import type { ClueAnswer, GameState, Player, State } from "~/engine/state";
import { newAnswerGrid } from "~/engine/state";
import type { Game } from "~/models/convert.server";
import type { TeamId } from "~/models/team";

const DB_NAME = "jep-offline";
const DB_VERSION = 1;
const GAMES_STORE = "games";
const SOLO_STATE_STORE = "soloState";

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        db.createObjectStore(GAMES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SOLO_STATE_STORE)) {
        db.createObjectStore(SOLO_STATE_STORE, { keyPath: "gameId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function idbGet<T>(
  db: IDBDatabase,
  store: string,
  key: string,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Game cache
// ---------------------------------------------------------------------------

export interface CachedGame {
  id: string;
  game: Game;
  title: string;
  author: string;
  cachedAt: number;
}

export async function cacheGame(entry: CachedGame): Promise<void> {
  const db = await getDb();
  await idbPut(db, GAMES_STORE, entry);
}

export async function getCachedGame(
  gameId: string,
): Promise<CachedGame | undefined> {
  const db = await getDb();
  return idbGet<CachedGame>(db, GAMES_STORE, gameId);
}

export async function getAllCachedGames(): Promise<CachedGame[]> {
  const db = await getDb();
  return idbGetAll<CachedGame>(db, GAMES_STORE);
}

export async function deleteCachedGame(gameId: string): Promise<void> {
  const db = await getDb();
  await idbDelete(db, GAMES_STORE, gameId);
}

// ---------------------------------------------------------------------------
// Solo state persistence
// ---------------------------------------------------------------------------

export interface SavedSoloState {
  gameId: string;
  state: SerializedState;
  userId: string;
  name: string;
  savedAt: number;
}

/** Serialized form of State with Maps replaced by entry arrays. */
interface SerializedState {
  type: GameState;
  answers: [string, [string, string][]][];
  /** Missing in saves from before multiple choice questions. */
  choicePicks?: [string, [string, number][]][];
  boardControl: string | null;
  players: [string, Player][];
  leftPlayers: [string, Player][];
  wagers: [string, [string, number][]][];
  isAnswered: SerializedClueAnswer[][][];
  checkCorrection?: SerializedCheckCorrection | null;
  /** Missing in saves from before team mode. */
  teamNames?: [TeamId, string][];
  activeClue: [number, number] | null;
  numAnswered: number;
  numCluesInBoard: number;
  round: number;
  buzzes: [string, number][];
  numExpectedWagers: number;
  clockRunning: boolean;
  clockAccumulatedMs: number;
  clockLastResumedAt: number | null;
  gameOverAt?: number | null;
  isPaused: boolean;
  /** Missing in saves from before the answer timer. */
  answerTimeSec?: number;
  autoWrongOnTimeout?: boolean;
  /** Missing in saves from before the room timers. */
  readTimeSec?: number | null;
  buzzWindowSec?: number;
  finalAnswerTimeSec?: number;
  wagerTimeSec?: number;
}

interface SerializedClueAnswer {
  isAnswered: boolean;
  answeredBy: [string, boolean][];
  answerOrder: number;
}

interface SerializedCheckCorrection {
  round: number;
  i: number;
  j: number;
  boardControlBefore: string | null;
  checks: [string, boolean][];
}

export function serializeState(state: State): SerializedState {
  return {
    type: state.type,
    answers: Array.from(state.answers.entries()).map(([k, v]) => [
      k,
      Array.from(v.entries()),
    ]),
    choicePicks: Array.from(state.choicePicks.entries()).map(([k, v]) => [
      k,
      Array.from(v.entries()),
    ]),
    boardControl: state.boardControl,
    players: Array.from(state.players.entries()),
    leftPlayers: Array.from(state.leftPlayers.entries()),
    wagers: Array.from(state.wagers.entries()).map(([k, v]) => [
      k,
      Array.from(v.entries()),
    ]),
    isAnswered: state.isAnswered.map((round) =>
      round.map((row) =>
        row.map((cell) => ({
          isAnswered: cell.isAnswered,
          answeredBy: Array.from(cell.answeredBy.entries()),
          answerOrder: cell.answerOrder,
        })),
      ),
    ),
    checkCorrection: state.checkCorrection
      ? {
          ...state.checkCorrection,
          checks: Array.from(state.checkCorrection.checks.entries()),
        }
      : null,
    teamNames: Array.from(state.teamNames.entries()),
    activeClue: state.activeClue,
    numAnswered: state.numAnswered,
    numCluesInBoard: state.numCluesInBoard,
    round: state.round,
    buzzes: Array.from(state.buzzes.entries()),
    numExpectedWagers: state.numExpectedWagers,
    clockRunning: state.clockRunning,
    clockAccumulatedMs: state.clockAccumulatedMs,
    clockLastResumedAt: state.clockLastResumedAt,
    gameOverAt: state.gameOverAt,
    isPaused: state.isPaused,
    answerTimeSec: state.answerTimeSec,
    autoWrongOnTimeout: state.autoWrongOnTimeout,
    readTimeSec: state.readTimeSec,
    buzzWindowSec: state.buzzWindowSec,
    finalAnswerTimeSec: state.finalAnswerTimeSec,
    wagerTimeSec: state.wagerTimeSec,
  };
}

export function deserializeState(
  serialized: SerializedState,
  game: Game,
): State {
  return {
    type: serialized.type,
    answers: new Map(serialized.answers.map(([k, v]) => [k, new Map(v)])),
    choicePicks: new Map(
      (serialized.choicePicks ?? []).map(([k, v]) => [k, new Map(v)]),
    ),
    boardControl: serialized.boardControl,
    game,
    players: new Map(serialized.players),
    leftPlayers: new Map(serialized.leftPlayers),
    wagers: new Map(serialized.wagers.map(([k, v]) => [k, new Map(v)])),
    // Saves from before uneven boards were supported sized the grid from the
    // first category; lay the saved cells over a grid of the game's shape.
    isAnswered: game.boards.map((board, round) =>
      newAnswerGrid(board).map((row, i) =>
        row.map((empty, j): ClueAnswer => {
          const cell = serialized.isAnswered.at(round)?.at(i)?.at(j);
          return cell
            ? {
                isAnswered: cell.isAnswered,
                answeredBy: new Map(cell.answeredBy),
                answerOrder: cell.answerOrder,
              }
            : empty;
        }),
      ),
    ),
    checkCorrection: serialized.checkCorrection
      ? {
          ...serialized.checkCorrection,
          checks: new Map(serialized.checkCorrection.checks),
        }
      : null,
    teamNames: new Map(serialized.teamNames ?? []),
    // Solo play has no admin, so there are never admin score changes.
    scoreAdjustments: [],
    // Solo play has no host either.
    host: null,
    revealed: new Map(),
    activeClue: serialized.activeClue,
    numAnswered: serialized.numAnswered,
    numCluesInBoard: serialized.numCluesInBoard,
    round: serialized.round,
    buzzes: new Map(serialized.buzzes),
    numExpectedWagers: serialized.numExpectedWagers,
    clockRunning: false,
    clockAccumulatedMs: serialized.clockAccumulatedMs,
    clockLastResumedAt: null,
    gameOverAt: serialized.gameOverAt ?? null,
    // Never restore into a paused state — resume fresh on reload.
    isPaused: false,
    answerTimeSec: isAnswerTimeSec(serialized.answerTimeSec)
      ? serialized.answerTimeSec
      : 0,
    autoWrongOnTimeout:
      serialized.autoWrongOnTimeout ?? DEFAULT_AUTO_WRONG_ON_TIMEOUT,
    // A turn restored from a save gets no timer: its start was in another
    // session (it would already be over).
    answerStartedAt: null,
    answerTimedOut: null,
    readTimeSec: isReadTimeSec(serialized.readTimeSec)
      ? serialized.readTimeSec
      : DEFAULT_ROOM_TIMERS.readTimeSec,
    buzzWindowSec: isBuzzWindowSec(serialized.buzzWindowSec)
      ? serialized.buzzWindowSec
      : DEFAULT_ROOM_TIMERS.buzzWindowSec,
    finalAnswerTimeSec: isFinalAnswerTimeSec(serialized.finalAnswerTimeSec)
      ? serialized.finalAnswerTimeSec
      : DEFAULT_ROOM_TIMERS.finalAnswerTimeSec,
    wagerTimeSec: isWagerTimeSec(serialized.wagerTimeSec)
      ? serialized.wagerTimeSec
      : DEFAULT_ROOM_TIMERS.wagerTimeSec,
    // Like the answer turn: a wager or Final answer step restored from a
    // save has no timer.
    wagerStartedAt: null,
    longFormStartedAt: null,
  };
}

export async function saveSoloState(entry: SavedSoloState): Promise<void> {
  const db = await getDb();
  await idbPut(db, SOLO_STATE_STORE, entry);
}

export async function getSavedSoloState(
  gameId: string,
): Promise<SavedSoloState | undefined> {
  const db = await getDb();
  return idbGet<SavedSoloState>(db, SOLO_STATE_STORE, gameId);
}

export async function deleteSavedSoloState(gameId: string): Promise<void> {
  const db = await getDb();
  await idbDelete(db, SOLO_STATE_STORE, gameId);
}
