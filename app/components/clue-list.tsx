import classNames from "classnames";
import type { Clue } from "~/models/convert.server";

import { useEngineContext } from "~/engine/use-engine-context";

function ClueItem({
  clue,
  idx,
  focusedClueIdx,
  onFocusClue,
}: {
  clue: Clue;
  idx: [number, number];
  focusedClueIdx?: [number, number];
  onFocusClue: (i: number, j: number) => void;
}) {
  const { round, isAnswered } = useEngineContext();

  const [i, j] = idx;
  const isFocused =
    focusedClueIdx && focusedClueIdx[0] === i && focusedClueIdx[1] === j;
  const isHalfFocused = focusedClueIdx && focusedClueIdx[0] === i;
  const roundMultiplier = round + 1;

  const value = clue.value * roundMultiplier;
  const text = isAnswered(i, j) ? clue.clue : "?";

  return (
    <button
      className={classNames("flex py-1 border-l-8 w-full", {
        "text-gray-500": isAnswered(i, j),
        "bg-blue-300": isFocused,
        "border-l-blue-300": isHalfFocused,
        "border-l-transparent": !isHalfFocused,
      })}
      onClick={() => onFocusClue(i, j)}
    >
      <div className="ml-1 font-bold leading-5">{value}</div>
      <div className="ml-3 break-words text-left">{text}</div>
    </button>
  );
}

export default function ClueList({
  focusedClueIdx,
  onFocusClue,
}: {
  focusedClueIdx?: [number, number];
  onFocusClue: (i: number, j: number) => void;
}) {
  const { board } = useEngineContext();
  return (
    <div className="relative flex flex-wrap px-0 py-6">
      {board.categories.map((category, j) => (
        <div
          key={`category-${j}`}
          className="flex flex-col gap-2 p-2 w-full sm:w-52"
        >
          <div
            title={category.name}
            className="font-bold text-lg block whitespace-nowrap overflow-hidden overflow-ellipsis"
          >
            {category.name}
          </div>
          <div className="relative sm:basis-96 grow overflow-y-auto border-t-gray-300 border-t-2 mt-2 pr-3">
            {category.clues.map((clue, i) => {
              return (
                <ClueItem
                  key={`clue-${i}-${j}`}
                  clue={clue}
                  idx={[i, j]}
                  focusedClueIdx={focusedClueIdx}
                  onFocusClue={onFocusClue}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
