import classNames from "classnames";
import * as React from "react";

import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";
import BoardState from "~/utils/board-state";

export enum Round {
  Single = 1,
  Double,
  Final,
  End,
}

export const NUM_CATEGORIES = 6;
export const NUM_CLUES_PER_CATEGORY = 5;

function Clue({
  clue,
  i,
  j,
  round,
  isActive,
  isAnswered,
  onClick,
}: {
  clue: Clue;
  i: number;
  j: number;
  round: Round;
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

  const clueValue = (i + 1) * 200 * round.valueOf();
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
      key={`clue-${i}-${j}`}
      className={classNames(
        "p-5 bg-blue-900 hover:bg-blue-700 focus:bg-blue-700 transition-colors border-black border-8",
        { isActive }
      )}
      onClick={() => onClick(i, j)}
      onKeyDown={(e) => onClickKeyboard(e, i, j)}
      role="button"
      tabIndex={i * NUM_CLUES_PER_CATEGORY + j + 1}
    >
      <div className="flex justify-center items-center">{clueText}</div>
    </td>
  );
}

function ClueRow({
  clues,
  i,
  boardState,
  round,
  onClickClue,
}: {
  clues: Clue[];
  i: number;
  round: Round;
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
            clue={clue}
            i={i}
            j={j}
            round={round}
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
  round,
  boardState,
  onClickClue,
}: {
  board: Board;
  round: Round;
  boardState?: BoardState;
  onClickClue: (categoryIdx: number, clueIdx: number) => void;
}) {
  return (
    <table className="bg-black text-white border-spacing-3 table-fixed w-full">
      <tr>
        {board.categories.map((category) => (
          <th className="p-5 bg-blue-900 border-black border-8 font-impact">
            <div className="text-4xl font-bold mb-2 break-words uppercase">
              {category}
            </div>
          </th>
        ))}
      </tr>
      {board.clues.map((clues, i) => (
        <ClueRow
          clues={clues}
          i={i}
          round={round}
          boardState={boardState}
          onClickClue={onClickClue}
        />
      ))}
    </table>
  );
}
