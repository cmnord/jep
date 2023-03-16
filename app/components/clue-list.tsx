import classNames from "classnames";

import { useEngineContext } from "~/engine";
import type { Clue } from "~/models/convert.server";
import { getClueValue } from "~/utils/utils";

function ClueItem({
  answered,
  clue,
  focused,
  halfFocused,
  onFocus,
  value,
}: {
  answered: boolean;
  clue: Clue;
  focused: boolean;
  halfFocused: boolean;
  onFocus: () => void;
  value: number;
}) {
  const text = answered ? clue.clue : "?";

  return (
    <button
      className={classNames("flex py-1 border-l-8 w-full", {
        "text-gray-500": answered,
        "bg-blue-300": focused,
        "border-l-blue-300": halfFocused,
        "border-l-transparent": !halfFocused,
      })}
      onClick={onFocus}
    >
      <div className="ml-1 font-bold leading-5">{value}</div>
      <div className="ml-3 break-words text-left">{text}</div>
    </button>
  );
}

export default function ConnectedClueList({
  focusedClue,
  setFocusedClue,
}: {
  focusedClue?: [number, number];
  setFocusedClue: (i: number, j: number) => void;
}) {
  const { board, round, isAnswered } = useEngineContext();
  if (!board) return null;

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
                  answered={isAnswered(i, j)}
                  value={getClueValue(i, round)}
                  halfFocused={focusedClue ? focusedClue[0] === i : false}
                  focused={
                    focusedClue
                      ? focusedClue[0] === i && focusedClue[1] === j
                      : false
                  }
                  onFocus={() => setFocusedClue(i, j)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
