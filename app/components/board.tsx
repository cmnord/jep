import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";

import type { Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";

function Category({ category }: { category: string }) {
  const words = category.split(" ");
  const numWords = words.length;
  const wordScore = words.join("").length * numWords;
  return (
    <th className="p-4 bg-blue-1000 border-black text-shadow border-8 font-impact border-b-12">
      <div
        className={classNames("mt-auto font-bold break-words uppercase", {
          "text-4xl": wordScore <= 5,
          "text-3xl": wordScore > 5 && wordScore <= 20,
          "text-2xl": wordScore > 20 && wordScore < 30,
          "text-xl": wordScore > 30,
        })}
      >
        {category}
      </div>
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
  const { round, isAnswered } = useGameContext();
  const roundMultiplier = round + 1;

  const clueValue = (i + 1) * 200 * roundMultiplier;

  // TODO: daily double / wagerable text
  const clueText = isAnswered(i, j) ? (
    <p className="uppercase font-korinna">{clue.answer}</p>
  ) : (
    <p className="text-5xl text-yellow-1000 text-shadow-md font-impact">
      ${clueValue}
    </p>
  );

  function handleClickClue(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    i: number,
    j: number
  ) {
    e.preventDefault();
    return onClickClue(i, j);
  }

  return (
    <td className="p-1 h-full">
      <button
        type="submit"
        disabled={!hasBoardControl}
        onClick={(e) => handleClickClue(e, i, j)}
        onFocus={() => onFocusClue(i, j)}
        onKeyDown={(e) => onKeyDownClue(e, i, j)}
        className={classNames(
          "px-4 py-3 h-full w-full bg-blue-1000 hover:bg-blue-700 focus:bg-blue-700 transition-colors",
          {
            "text-blue-1000 hover:text-white focus:text-white hover:text-shadow transition":
              isAnswered(i, j),
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
  const { board, round, boardControl } = useGameContext();
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
    <div className="w-full overflow-scroll md:flex md:flex-col md:items-center">
      <table className="bg-black text-white border-spacing-3 table-fixed h-1">
        <thead>
          <tr>
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
  );
}
