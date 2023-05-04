import type { Game } from "~/models/convert.server";
import { generateGrid } from "~/utils";

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
  readonly type: GameState;
  readonly activeClue: [number, number] | null;
  readonly answers: Map<string, string>;
  readonly boardControl: string | null;
  readonly buzzes: Map<string, number>;
  readonly game: Game;
  /** warning! use setIsAnswered to deep-copy instead of mutating State. */
  readonly isAnswered: ClueAnswer[][];
  readonly numAnswered: number;
  readonly numCluesInBoard: number;
  readonly numExpectedWagers: number;
  readonly players: Map<string, Player>;
  readonly round: number;
  readonly wagers: Map<string, number>;

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
    return new State({
      type: newState.type ?? prevState.type,
      activeClue:
        newState.activeClue !== undefined
          ? newState.activeClue
          : prevState.activeClue,
      answers: newState.answers ?? prevState.answers,
      boardControl:
        newState.boardControl !== undefined
          ? newState.boardControl
          : prevState.boardControl,
      buzzes: newState.buzzes ?? prevState.buzzes,
      game: prevState.game, // game does not change
      isAnswered: newState.isAnswered ?? prevState.isAnswered,
      numAnswered:
        newState.numAnswered !== undefined
          ? newState.numAnswered
          : prevState.numAnswered,
      numCluesInBoard:
        newState.numCluesInBoard !== undefined
          ? newState.numCluesInBoard
          : prevState.numCluesInBoard,
      numExpectedWagers:
        newState.numExpectedWagers !== undefined
          ? newState.numExpectedWagers
          : prevState.numExpectedWagers,
      players: newState.players ?? prevState.players,
      round: newState.round !== undefined ? newState.round : prevState.round,
      wagers: newState.wagers ?? prevState.wagers,
    });
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
