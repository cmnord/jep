import classNames from "classnames";
import * as React from "react";

import { Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";

function Category({ category }: { category: string }) {
  const words = category.split(" ");
  const numWords = words.length;
  const wordScore = words.join("").length * numWords;
  return (
    <th className="p-4 bg-blue-1000 border-black text-shadow-1 border-8 font-impact border-b-12">
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

function Clue({
  clue,
  i,
  j,
  onFocusClue,
  onKeyDownClue,
}: {
  clue: Clue;
  i: number;
  j: number;
  onFocusClue: (i: number, j: number) => void;
  onKeyDownClue: (e: React.KeyboardEvent, i: number, j: number) => void;
}) {
  const { round, isAnswered, onClickClue } = useGameContext();
  const roundMultiplier = round + 1;

  const clueValue = (i + 1) * 200 * roundMultiplier;

  // TODO: daily double / wagerable text
  const clueText = isAnswered(i, j) ? (
    <div className="uppercase font-korinna">
      <p>{clue.answer}</p>
    </div>
  ) : (
    <div className="text-5xl text-yellow-1000 text-shadow-3 font-impact">
      ${clueValue}
    </div>
  );
  return (
    <td
      onFocus={() => onFocusClue(i, j)}
      onKeyDown={(e) => onKeyDownClue(e, i, j)}
      className={classNames(
        "px-5 py-4 bg-blue-1000 hover:bg-blue-700 focus:bg-blue-700 transition-colors border-black border-8",
        {
          "text-blue-1000 hover:text-white focus:text-white hover:text-shadow-1 transition":
            isAnswered(i, j),
        }
      )}
      onClick={() => onClickClue(i, j)}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-center items-center">{clueText}</div>
    </td>
  );
}

function ClueRow({
  clues,
  i,
  onFocusClue,
  onKeyDownClue,
}: {
  clues: Clue[];
  i: number;
  onFocusClue: (i: number, j: number) => void;
  onKeyDownClue: (e: React.KeyboardEvent, i: number, j: number) => void;
}) {
  return (
    <tr key={`category-${i}`}>
      {clues.map((clue, j) => {
        return (
          <Clue
            key={`clue-${i}-${j}`}
            clue={clue}
            i={i}
            j={j}
            onFocusClue={onFocusClue}
            onKeyDownClue={onKeyDownClue}
          />
        );
      })}
    </tr>
  );
}

/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent({
  focusedClueIdx,
  onFocusClue,
}: {
  focusedClueIdx?: [number, number];
  onFocusClue: (i: number, j: number) => void;
}) {
  const { board, onClickClue, round } = useGameContext();
  const roundMultiplier = round + 1;

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
    const element = row?.children.item(j);
    if (!element) {
      return;
    }
    (element as HTMLElement).focus();
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

  const handleKeyDown = (event: React.KeyboardEvent, i: number, j: number) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      return onClickClue(i, j);
    }

    const currentRow = tbodyRef.current?.children.item(i);
    switch (event.key) {
      case "w":
      case "ArrowUp":
        const upElt = currentRow?.previousElementSibling?.children.item(j);
        if (upElt) {
          (upElt as HTMLElement).focus();
        }
        break;
      case "s":
      case "ArrowDown":
        const downElt = currentRow?.nextElementSibling?.children.item(j);
        if (downElt) {
          (downElt as HTMLElement).focus();
        }
        break;
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
      <table className="bg-black text-white border-spacing-3 table-fixed">
        <thead>
          <tr>
            {board.categoryNames.map((category) => (
              <Category key={category} category={category} />
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {sortedClueRows.map(([value, clues], i) => (
            <ClueRow
              key={value}
              clues={clues}
              i={i}
              onFocusClue={onFocusClue}
              onKeyDownClue={handleKeyDown}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
