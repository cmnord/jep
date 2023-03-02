import { useFetcher } from "@remix-run/react";
import * as React from "react";

import { useEngineContext } from "~/engine";
import type { Board, Clue } from "~/models/convert.server";
import { getClueValue } from "~/utils/utils";
import { Category } from "./category";
import { ClueComponent } from "./clue";

function BoardComponent({
  board,
  hasBoardControl,
  isAnswered,
  onClickClue,
  onFocusClue,
  onKeyDownClue,
  round,
  tbodyRef,
}: {
  board: Board;
  hasBoardControl: boolean;
  isAnswered: (i: number, j: number) => boolean;
  onClickClue: (i: number, j: number) => void;
  onFocusClue: (i: number, j: number) => void;
  onKeyDownClue: (event: React.KeyboardEvent, i: number, j: number) => void;
  round: number;
  tbodyRef: React.RefObject<HTMLTableSectionElement>;
}) {
  const clueRows = new Map<number, Clue[]>();
  for (const category of board.categories) {
    const clues = category.clues;
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[i];
      const clueValue = getClueValue(i, round);
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
                    value={getClueValue(i, round)}
                    answered={isAnswered(i, j)}
                    hasBoardControl={hasBoardControl}
                    onFocus={() => onFocusClue(i, j)}
                    onClick={() => onClickClue(i, j)}
                    onKeyDown={(e) => onKeyDownClue(e, i, j)}
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

/** BoardComponent is purely presentational and renders the board. */
export function ConnectedBoardComponent({
  focusedClue,
  setFocusedClue,
  userId,
  roomName,
}: {
  focusedClue?: [number, number];
  setFocusedClue: (i: number, j: number) => void;
  userId: string;
  roomName: string;
}) {
  const { board, round, boardControl, isAnswered } = useEngineContext();
  const fetcher = useFetcher();
  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  const hasBoardControl = boardControl === userId;

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
    if (focusedClue) {
      const [i, j] = focusedClue;
      focusCell(i, j);
    }
  }, [focusedClue]);

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
    <BoardComponent
      board={board}
      tbodyRef={tbodyRef}
      hasBoardControl={hasBoardControl}
      round={round}
      isAnswered={isAnswered}
      onClickClue={handleClickClue}
      onFocusClue={setFocusedClue}
      onKeyDownClue={handleKeyDown}
    />
  );
}
