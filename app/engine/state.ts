import type { Game } from "~/models/convert.server";
import { generateGrid } from "~/utils/utils";

export const UNREVEALED_CLUE = "unrevealed";

export enum GameState {
  PreviewRound = "PreviewRound",
  ShowBoard = "ShowBoard",
  WagerClue = "WagerClue",
  ReadClue = "ReadClue",
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

export class State {
  type: GameState;
  activeClue: [number, number] | null;
  answers: Map<string, string>;
  boardControl: string | null;
  buzzes: Map<string, number>;
  readonly game: Game;
  /** warning! use setIsAnswered to deep-copy instead of mutating State. */
  isAnswered: ClueAnswer[][];
  numAnswered: number;
  numCluesInBoard: number;
  numExpectedWagers: number;
  players: Map<string, Player>;
  round: number;
  wagers: Map<string, number>;

  constructor(prevState: Pick<State, "game"> & Partial<State>) {
    this.type = prevState.type ?? GameState.PreviewRound;
    this.activeClue = prevState.activeClue ?? null;
    this.answers = prevState.answers ?? new Map();
    this.boardControl = prevState.boardControl ?? null;
    this.buzzes = prevState.buzzes ?? new Map();
    this.game = prevState.game;

    this.round = prevState.round ?? 0;
    const board = prevState.game.boards.at(this.round);
    if (!board) {
      throw new Error("board must have at least one round");
    }

    const n = board.categories[0].clues.length;
    const m = board.categories.length;

    this.isAnswered =
      prevState.isAnswered ??
      generateGrid<ClueAnswer>(n, m, {
        isAnswered: false,
        answeredBy: new Map(),
      });

    this.numAnswered = prevState.numAnswered ?? 0;
    this.numCluesInBoard =
      prevState.numCluesInBoard ?? this.getNumCluesInBoard(this.round);
    this.numExpectedWagers = prevState.numExpectedWagers ?? 0;
    this.players = prevState.players ?? new Map();
    this.wagers = prevState.wagers ?? new Map();
  }

  /** fromGame creates a new initial state from the beginning based on the game.
   */
  public static fromGame(game: Game): State {
    return new State({ game });
  }

  /** copy copies prevState, then adds any fields from newState. */
  public static copy(prevState: State, newState: Partial<State>): State {
    const state = new State(prevState);

    if (newState.type) state.type = newState.type;
    if (newState.activeClue !== undefined)
      state.activeClue = newState.activeClue;

    if (newState.answers) state.answers = newState.answers;
    if (newState.boardControl !== undefined)
      state.boardControl = newState.boardControl;

    if (newState.buzzes) state.buzzes = newState.buzzes;
    if (newState.isAnswered) state.isAnswered = newState.isAnswered;
    if (newState.numAnswered !== undefined)
      state.numAnswered = newState.numAnswered;

    if (newState.numCluesInBoard !== undefined)
      state.numCluesInBoard = newState.numCluesInBoard;

    if (newState.numExpectedWagers !== undefined)
      state.numExpectedWagers = newState.numExpectedWagers;

    if (newState.players) state.players = newState.players;
    if (newState.round !== undefined) state.round = newState.round;
    if (newState.wagers) state.wagers = newState.wagers;

    return state;
  }

  /** getClueValue gets the clue's wagered value if it's wagerable and its value
   * on the board otherwise.
   */
  getClueValue([i, j]: [number, number], userId: string) {
    const board = this.game.boards.at(this.round);
    const clue = board?.categories.at(j)?.clues.at(i);
    if (!clue) {
      throw new Error(`No clue exists at (${i}, ${j})`);
    }
    if (clue.wagerable) {
      return this.wagers.get(userId) ?? 0;
    }
    return clue.value;
  }

  /** getNumCluesInBoard gets the number of clues in that round of the game.
   */
  getNumCluesInBoard(round: number) {
    const board = this.game.boards.at(round);
    if (!board) {
      return 0;
    }
    return board.categories.reduce(
      (acc, category) =>
        (acc += category.clues.filter(
          (c) => c.clue.toLowerCase() !== UNREVEALED_CLUE
        ).length),
      0
    );
  }
}
