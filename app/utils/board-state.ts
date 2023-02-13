import { Board } from "~/models/board.server";
import ClueState from "./clue-state";

export default class BoardState {
  board: Board;
  state: ClueState[][];
  numClues: number;
  numAnswered: number;

  constructor(board: Board) {
    this.board = board;
    this.state = [];
    this.numClues = 0;
    this.numAnswered = 0;

    let j = 0;
    for (const category of board.categories) {
      const clues = board.clues[category];
      for (let i = 0; i < clues.length; i++) {
        const clueState = new ClueState();
        const clueRow = this.state[i];
        if (clueRow) {
          clueRow.push(clueState);
        } else {
          this.state.push([clueState]);
        }
        if (clueState.isAnswered) {
          this.numAnswered++;
        }
        this.numClues++;
      }
      j++;
    }
  }

  get(i: number, j: number) {
    const row = this.state[i];
    if (row) {
      return row[j];
    }
  }

  /** set returns a new BoardState with the cell set to the given value. */
  set(i: number, j: number, state: ClueState) {
    const prevState = this.state[i][j];
    if (!prevState.isAnswered && state.isAnswered) {
      this.numAnswered++;
    } else if (prevState.isAnswered && !state.isAnswered) {
      this.numAnswered--;
    }
    this.state[i][j] = state;
    return this;
  }

  answered() {
    return this.numAnswered === this.numClues;
  }
}
