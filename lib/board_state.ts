import ClueState from "./clue_state";

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : TupleOf<T, N, []>
  : never;
type TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : TupleOf<T, N, [T, ...R]>;

type CategoryState = Tuple<ClueState, 5>;
type BoardTuple = Tuple<CategoryState, 6>;

export default class BoardState {
  state: BoardTuple;

  constructor(startState?: BoardState) {
    if (startState) {
      this.state = [
        [
          new ClueState(startState.get(0, 0)),
          new ClueState(startState.get(0, 1)),
          new ClueState(startState.get(0, 2)),
          new ClueState(startState.get(0, 3)),
          new ClueState(startState.get(0, 4)),
        ],
        [
          new ClueState(startState.get(1, 0)),
          new ClueState(startState.get(1, 1)),
          new ClueState(startState.get(1, 2)),
          new ClueState(startState.get(1, 3)),
          new ClueState(startState.get(1, 4)),
        ],
        [
          new ClueState(startState.get(2, 0)),
          new ClueState(startState.get(2, 1)),
          new ClueState(startState.get(2, 2)),
          new ClueState(startState.get(2, 3)),
          new ClueState(startState.get(2, 4)),
        ],
        [
          new ClueState(startState.get(3, 0)),
          new ClueState(startState.get(3, 1)),
          new ClueState(startState.get(3, 2)),
          new ClueState(startState.get(3, 3)),
          new ClueState(startState.get(3, 4)),
        ],
        [
          new ClueState(startState.get(4, 0)),
          new ClueState(startState.get(4, 1)),
          new ClueState(startState.get(4, 2)),
          new ClueState(startState.get(4, 3)),
          new ClueState(startState.get(4, 4)),
        ],
        [
          new ClueState(startState.get(5, 0)),
          new ClueState(startState.get(5, 1)),
          new ClueState(startState.get(5, 2)),
          new ClueState(startState.get(5, 3)),
          new ClueState(startState.get(5, 4)),
        ],
      ];
      return;
    }

    this.state = [
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
      [
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
        new ClueState(),
      ],
    ];
  }

  get(i: number, j: number) {
    return this.state[i][j];
  }

  /** set returns a new BoardState with the cell set to the given value. */
  set(i: number, j: number, state: ClueState) {
    const newBoard = new BoardState(this);
    newBoard.state[i][j] = state;
    return newBoard;
  }
}
