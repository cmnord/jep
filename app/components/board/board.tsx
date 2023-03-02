import { useFetcher } from "@remix-run/react";
import * as React from "react";

import { useEngineContext } from "~/engine/use-engine-context";
import type { Clue } from "~/models/convert.server";
import { Category } from "./category";
import { ClueComponent } from "./clue";

/** BoardComponent is purely presentational and renders the board. */
export function BoardComponent({
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
  const { board, round, boardControl, isAnswered } = useEngineContext();
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
                    value={(i + 1) * 200 * (round + 1)}
                    answered={isAnswered(i, j)}
                    hasBoardControl={hasBoardControl}
                    onFocus={() => onFocusClue(i, j)}
                    onClick={() => handleClickClue(i, j)}
                    onKeyDown={(e) => handleKeyDown(e, i, j)}
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
