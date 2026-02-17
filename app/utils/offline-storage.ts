import type { ClueAnswer, GameState, Player, State } from "~/engine/state";
import type { Game } from "~/models/convert.server";

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
  boardControl: string | null;
  players: [string, Player][];
  leftPlayers: [string, Player][];
  wagers: [string, [string, number][]][];
  isAnswered: SerializedClueAnswer[][][];
  activeClue: [number, number] | null;
  numAnswered: number;
  numCluesInBoard: number;
  round: number;
  buzzes: [string, number][];
  numExpectedWagers: number;
  clockRunning: boolean;
  clockAccumulatedMs: number;
  clockLastResumedAt: number | null;
}

interface SerializedClueAnswer {
  isAnswered: boolean;
  answeredBy: [string, boolean][];
  answerOrder: number;
}

export function serializeState(state: State): SerializedState {
  return {
    type: state.type,
    answers: Array.from(state.answers.entries()).map(([k, v]) => [
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
    activeClue: state.activeClue,
    numAnswered: state.numAnswered,
    numCluesInBoard: state.numCluesInBoard,
    round: state.round,
    buzzes: Array.from(state.buzzes.entries()),
    numExpectedWagers: state.numExpectedWagers,
    clockRunning: state.clockRunning,
    clockAccumulatedMs: state.clockAccumulatedMs,
    clockLastResumedAt: state.clockLastResumedAt,
  };
}

export function deserializeState(
  serialized: SerializedState,
  game: Game,
): State {
  return {
    type: serialized.type,
    answers: new Map(serialized.answers.map(([k, v]) => [k, new Map(v)])),
    boardControl: serialized.boardControl,
    game,
    players: new Map(serialized.players),
    leftPlayers: new Map(serialized.leftPlayers),
    wagers: new Map(serialized.wagers.map(([k, v]) => [k, new Map(v)])),
    isAnswered: serialized.isAnswered.map((round) =>
      round.map((row) =>
        row.map(
          (cell): ClueAnswer => ({
            isAnswered: cell.isAnswered,
            answeredBy: new Map(cell.answeredBy),
            answerOrder: cell.answerOrder,
          }),
        ),
      ),
    ),
    activeClue: serialized.activeClue,
    numAnswered: serialized.numAnswered,
    numCluesInBoard: serialized.numCluesInBoard,
    round: serialized.round,
    buzzes: new Map(serialized.buzzes),
    numExpectedWagers: serialized.numExpectedWagers,
    clockRunning: false,
    clockAccumulatedMs: serialized.clockAccumulatedMs,
    clockLastResumedAt: null,
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
