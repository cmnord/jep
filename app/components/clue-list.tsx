import classNames from "classnames";
import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";
import BoardState from "~/utils/board-state";
import ClueState from "~/utils/clue-state";

function ClueItem({
  clue,
  state,
  roundMultiplier,
  idx,
  focusedClueIdx,
  onClick,
}: {
  clue: Clue;
  state?: ClueState;
  roundMultiplier: number;
  idx: { i: number; j: number };
  focusedClueIdx?: { i: number; j: number };
  onClick: (i: number, j: number) => void;
}) {
  const isFocused =
    focusedClueIdx && focusedClueIdx.i === idx.i && focusedClueIdx.j === idx.j;
  const isAnswered = state?.isAnswered ?? false;
  const isHalfFocused = focusedClueIdx && focusedClueIdx.i === idx.i;

  const value = clue.value * roundMultiplier;
  const text = isAnswered ? clue.clue : "?";

  return (
    <button
      className={classNames("flex py-1 border-l-8 w-full", {
        "text-gray-500": isAnswered,
        "bg-blue-300": isFocused,
        "border-l-blue-300": isHalfFocused,
        "border-l-transparent": !isHalfFocused,
      })}
      onClick={() => onClick(idx.i, idx.j)}
    >
      <div className="ml-1 font-bold leading-5">{value}</div>
      <div className="ml-3 break-words text-left">{text}</div>
    </button>
  );
}

export default function ClueList({
  board,
  roundMultiplier,
  boardState,
  focusedClueIdx,
  onClickClue,
}: {
  board: Board;
  roundMultiplier: number;
  boardState: BoardState;
  focusedClueIdx?: { i: number; j: number };
  onClickClue: (i: number, j: number) => void;
}) {
  return (
    <div className="relative flex flex-wrap px-0 py-6">
      {board.categories.map((category, j) => (
        <div
          key={`category-${j}`}
          className="flex flex-col gap-2 p-2 w-full sm:w-52"
        >
          <div className="font-bold text-lg">{category.name}</div>
          <div className="relative sm:basis-96 grow overflow-y-auto border-t-gray-300 border-t-2 mt-2 pr-3">
            {category.clues.map((clue, i) => {
              const state = boardState.get(i, j);
              return (
                <ClueItem
                  key={`clue-${i}-${j}`}
                  clue={clue}
                  state={state}
                  roundMultiplier={roundMultiplier}
                  idx={{ i, j }}
                  focusedClueIdx={focusedClueIdx}
                  onClick={onClickClue}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
