import classNames from "classnames";
import * as React from "react";

import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";
import BoardState from "~/utils/board-state";

const NUM_CLUES_PER_CATEGORY = 5;

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
    <div className="text-5xl text-yellow-400 text-shadow font-impact">
      ${clueValue}
    </div>
  );
  return (
    <td
      className={classNames(
        "p-5 bg-blue-900 hover:bg-blue-700 focus:bg-blue-700 transition-colors border-black border-8",
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
  for (const category in board.clues) {
    const clues = board.clues[category];
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
    <table className="bg-black text-white border-spacing-3 table-fixed w-full">
      <tbody>
        <tr>
          {board.categories.map((category) => (
            <th
              key={category}
              className="p-5 bg-blue-900 border-black border-8 font-impact"
            >
              <div className="text-4xl font-bold mb-2 break-words uppercase">
                {category}
              </div>
            </th>
          ))}
        </tr>
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
  );
}
