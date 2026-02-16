import type { Clue, Game } from "~/models/convert.server";
import { generateGrid } from "~/utils";

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
}

export interface Player {
  userId: string;
  name: string;
  score: number;
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
  readonly boardControl: string | null;
  readonly game: Game;
  /** Active players in the game. */
  readonly players: Map<string, Player>;
  /** Players who voluntarily left mid-game. Preserved for post-game review. */
  readonly leftPlayers: Map<string, Player>;
  readonly wagers: Map<RoundIJKey, Map<string, number>>;
  readonly isAnswered: ClueAnswer[][][];

  // per round state
  readonly activeClue: [number, number] | null;
  readonly numAnswered: number;
  readonly numCluesInBoard: number;
  readonly round: number;

  // per clue state
  readonly buzzes: Map<string, number>;
  readonly numExpectedWagers: number;

  // clock state
  readonly clockRunning: boolean;
  readonly clockAccumulatedMs: number;
  readonly clockLastResumedAt: string | null;
}

/** stateFromGame creates a new initial state based on the game. */
export function stateFromGame(game: Game) {
  const state: State = {
    type: GameState.PreviewRound,
    activeClue: null,
    answers: new Map(),
    boardControl: null,
    buzzes: new Map(),
    game,
    round: 0,
    isAnswered: [],
    numAnswered: 0,
    numCluesInBoard: getNumCluesInBoard(game, 0),
    numExpectedWagers: 0,
    players: new Map(),
    leftPlayers: new Map(),
    wagers: new Map(),
    clockRunning: false,
    clockAccumulatedMs: 0,
    clockLastResumedAt: null,
  };

  for (let round = 0; round < game.boards.length; round++) {
    const board = game.boards[round];
    const n = board.categories[0].clues.length;
    const m = board.categories.length;
    state.isAnswered[round] = generateGrid(n, m, {
      isAnswered: false,
      answeredBy: new Map(),
    });
  }

  return state;
}

/** getPlayer looks up a player in both active and left player maps. */
export function getPlayer(state: State, userId: string): Player | undefined {
  return state.players.get(userId) ?? state.leftPlayers.get(userId);
}

/** getClueValue gets the clue's wagered value if it's wagerable and its value
 * on the board otherwise.
 */
export function getClueValue(
  state: State,
  [i, j]: [number, number],
  userId: string,
) {
  const board = state.game.boards.at(state.round);
  const clue = board?.categories.at(j)?.clues.at(i);
  if (!clue) {
    throw new Error(`No clue exists at (${i}, ${j})`);
  }
  if (clue.wagerable) {
    const key = `${state.round},${i},${j}`;
    const wagers = state.wagers.get(key);
    return wagers?.get(userId) ?? 0;
  }
  return clue.value;
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
