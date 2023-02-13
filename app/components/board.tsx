import classNames from "classnames";
import * as React from "react";

import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";
import BoardState from "~/utils/board-state";

const NUM_CLUES_PER_CATEGORY = 5;

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
  roundMultiplier,
  isActive,
  isAnswered,
  onClick,
}: {
  clue: Clue;
  i: number;
  j: number;
  roundMultiplier: number;
  isActive: boolean;
  isAnswered: boolean;
  onClick: (categoryIdx: number, clueIdx: number) => void;
}) {
  const onClickKeyboard = (
    e: React.KeyboardEvent<HTMLDivElement>,
    i: number,
    j: number
  ) => {
    if (e.key !== "Enter") {
      return;
    }
    onClick(i, j);
  };

  const clueValue = (i + 1) * 200 * roundMultiplier;
  const tabIndex = i * NUM_CLUES_PER_CATEGORY + j + 1;

  const clueText = isAnswered ? (
    <div className="opacity-0 hover:opacity-100 transition">
      {clue.isDailyDouble ? <p>DAILY DOUBLE</p> : null}
      <p>{clue.clue}</p>
      <p className="text-cyan-300 mt-4">{clue.answer}</p>
    </div>
  ) : (
    <div className="text-5xl text-yellow-1000 text-shadow-3 font-impact">
      ${clueValue}
    </div>
  );
  return (
    <td
      className={classNames(
        "px-5 py-4 bg-blue-1000 hover:bg-blue-700 focus:bg-blue-700 transition-colors border-black border-8",
        { isActive }
      )}
      onClick={() => onClick(i, j)}
      onKeyDown={(e) => onClickKeyboard(e, i, j)}
      role="button"
      tabIndex={tabIndex}
    >
      <div className="flex justify-center items-center">{clueText}</div>
    </td>
  );
}

function ClueRow({
  clues,
  i,
  boardState,
  roundMultiplier,
  onClickClue,
}: {
  clues: Clue[];
  i: number;
  roundMultiplier: number;
  boardState?: BoardState;
  onClickClue: (categoryIdx: number, clueIdx: number) => void;
}) {
  return (
    <tr key={`category-${i}`}>
      {clues.map((clue, j) => {
        const isActive = Boolean(boardState?.get(i, j)?.isActive);
        const isAnswered =
          Boolean(boardState?.get(i, j)?.isAnswered) && !isActive;
        return (
          <Clue
            key={`clue-${i}-${j}`}
            clue={clue}
            i={i}
            j={j}
            roundMultiplier={roundMultiplier}
            isActive={isActive}
            isAnswered={isAnswered}
            onClick={onClickClue}
          />
        );
      })}
    </tr>
  );
}
/** BoardComponent is purely presentational and renders the board. */
export default function BoardComponent({
  board,
  roundMultiplier,
  boardState,
  onClickClue,
}: {
  board: Board;
  roundMultiplier: number;
  boardState?: BoardState;
  onClickClue: (categoryIdx: number, clueIdx: number) => void;
}) {
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

  const sortedClueRows = Array.from(clueRows.entries()).sort(
    (a, b) => a[0] - b[0]
  );

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
        <tbody>
          {sortedClueRows.map(([value, clues], i) => (
            <ClueRow
              key={value}
              clues={clues}
              i={i}
              roundMultiplier={roundMultiplier}
              boardState={boardState}
              onClickClue={onClickClue}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
