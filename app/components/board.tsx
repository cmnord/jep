import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";
import { Textfit } from "react-textfit";

import type { Clue } from "~/models/convert.server";
import { useEngineContext } from "~/engine/use-engine-context";
import LoadingSpinner from "./loading-spinner";

const UNREVEALED_CLUE = "unrevealed";

function Category({ category }: { category: string }) {
  return (
    <th className="p-4 h-full bg-blue-1000 border-black border-8 border-b-12">
      <Textfit
        className="w-full h-20 flex items-center justify-center font-bold font-impact uppercase text-shadow-md"
        mode="multi"
      >
        {category}
      </Textfit>
    </th>
  );
}

function ClueComponent({
  clue,
  i,
  j,
  hasBoardControl,
  onFocusClue,
  onKeyDownClue,
  onClickClue,
}: {
  clue: Clue;
  i: number;
  j: number;
  hasBoardControl: boolean;
  onFocusClue: (i: number, j: number) => void;
  onClickClue: (i: number, j: number) => void;
  onKeyDownClue: (e: React.KeyboardEvent, i: number, j: number) => void;
}) {
  const { round, isAnswered } = useEngineContext();
  const roundMultiplier = round + 1;
  const [loading, setLoading] = React.useState(false);

  const clueValue = (i + 1) * 200 * roundMultiplier;

  const unrevealed = clue.clue.toLowerCase() === UNREVEALED_CLUE;

  // TODO: daily double / wagerable text
  const clueText = isAnswered(i, j) ? (
    unrevealed ? (
      <p className="text-sm text-gray-400">{UNREVEALED_CLUE}</p>
    ) : (
      <p className="uppercase font-korinna break-words">{clue.answer}</p>
    )
  ) : (
    <p className="text-4xl lg:text-5xl text-yellow-1000 text-shadow-md font-impact">
      ${clueValue} {loading && <LoadingSpinner />}
    </p>
  );

  // Reset loading state to false when the clue is answered
  React.useEffect(() => {
    if (isAnswered(i, j)) {
      setLoading(false);
    }
  }, [isAnswered, i, j]);

  function handleClickClue(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    i: number,
    j: number
  ) {
    e.preventDefault();
    setLoading(true);
    return onClickClue(i, j);
  }

  return (
    <td className="p-1 h-full">
      <button
        type="submit"
        disabled={!hasBoardControl || unrevealed}
        onClick={(e) => handleClickClue(e, i, j)}
        onFocus={() => onFocusClue(i, j)}
        onKeyDown={(e) => onKeyDownClue(e, i, j)}
        className={classNames(
          "px-4 py-3 h-full w-full bg-blue-1000  transition-colors",
          {
            "hover:bg-blue-700 focus:bg-blue-700": !unrevealed,
            "text-blue-1000 hover:text-white focus:text-white hover:text-shadow focus:text-shadow transition":
              isAnswered(i, j) && !unrevealed,
            "bg-gray-800 ": unrevealed,
          }
        )}
      >
        {clueText}
      </button>
    </td>
  );
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent({
  focusedClueIdx,
  onFocusClue,
  userId,
  roomName,
}: {
  focusedClueIdx?: [number, number];
  onFocusClue: (i: number, j: number) => void;
  userId: string;
  roomName: string;
}) {
  const { board, round, boardControl } = useEngineContext();
  const roundMultiplier = round + 1;
  const hasBoardControl = boardControl === userId;

  const fetcher = useFetcher();

  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  const clueRows = new Map<number, Clue[]>();
  for (const category of board.categories) {
    const clues = category.clues;
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[i];
      const clueValue = (i + 1) * 200 * roundMultiplier;
      const clueRow = clueRows.get(clueValue);
      if (clueRow) {
        clueRow.push(clue);
      } else {
        clueRows.set(clueValue, [clue]);
      }
    }
  }

  function focusCell(i: number, j: number) {
    const row = tbodyRef.current?.children.item(i);
    if (!row) {
      return;
    }
    const tdElement = row?.children.item(j);
    const cellButton = tdElement?.children.item(0);
    if (cellButton) {
      (cellButton as HTMLElement).focus();
    }
  }

  React.useEffect(() => {
    if (focusedClueIdx) {
      const [i, j] = focusedClueIdx;
      focusCell(i, j);
    }
  }, [focusedClueIdx]);

  const sortedClueRows = Array.from(clueRows.entries()).sort(
    (a, b) => a[0] - b[0]
  );

  function handleClickClue(i: number, j: number) {
    if (hasBoardControl) {
      return fetcher.submit(
        { i: i.toString(), j: j.toString(), userId },
        { method: "post", action: `/room/${roomName}/choose-clue` }
      );
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, i: number, j: number) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      return handleClickClue(i, j);
    }

    const currentRow = tbodyRef.current?.children.item(i);
    switch (event.key) {
      case "w":
      case "ArrowUp": {
        const upTd = currentRow?.previousElementSibling?.children.item(j);
        const cellButton = upTd?.children.item(0);
        if (cellButton) {
          return (cellButton as HTMLElement).focus();
        }
        break;
      }
      case "s":
      case "ArrowDown": {
        const downTd = currentRow?.nextElementSibling?.children.item(j);
        const cellButton = downTd?.children.item(0);
        if (cellButton) {
          (cellButton as HTMLElement).focus();
        }
        break;
      }
      case "a":
      case "ArrowLeft":
        return focusCell(i, j - 1);
      case "d":
      case "ArrowRight":
        return focusCell(i, j + 1);
    }
  };

  return (
    <div className="w-full overflow-x-scroll">
      <div className="max-w-screen-lg min-w-screen-md mx-auto">
        <table className="w-full table-fixed h-1 bg-black text-white border-spacing-3">
          <thead>
            <tr className="h-1">
              {board.categoryNames.map((category) => (
                <Category key={category} category={category} />
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {sortedClueRows.map(([value, clues], i) => (
              <tr key={value}>
                {clues.map((clue, j) => (
                  <ClueComponent
                    key={`clue-${i}-${j}`}
                    clue={clue}
                    i={i}
                    j={j}
                    hasBoardControl={hasBoardControl}
                    onFocusClue={onFocusClue}
                    onClickClue={handleClickClue}
                    onKeyDownClue={handleKeyDown}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
