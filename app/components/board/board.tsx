import { useFetcher } from "@remix-run/react";
import * as React from "react";
import useSound from "use-sound";

import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import type { Board, Clue } from "~/models/convert.server";
import { useSoloAction } from "~/utils/use-solo-action";
import { getNormalizedClueValue } from "~/utils/utils";
import { Category } from "./category";
import { ClueComponent } from "./clue";

const WAGER_SFX = "/sounds/wager.mp3";

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
      const clueValue = getNormalizedClueValue(i, round);
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
      <div
        className="mx-auto"
        style={{
          minWidth: `${120 * board.categories.length}px`,
          maxWidth: `${200 * board.categories.length}px`,
        }}
      >
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
                    value={value}
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
  const { board, round, boardControl, isAnswered, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);

  React.useEffect(() => {
    if (focusedClue) {
      const [i, j] = focusedClue;
      focusCell(i, j);
    }
  }, [focusedClue]);

  const [playWagerSfx] = useSound(WAGER_SFX, { volume: 0.1 });

  if (!board) return null;

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

  function handleClickClue(i: number, j: number) {
    if (board?.categories.at(j)?.clues.at(i)?.wagerable) {
      playWagerSfx();
    }
    if (hasBoardControl && !isAnswered(i, j)) {
      return fetcher.submit(
        { i: i.toString(), j: j.toString(), userId },
        { method: "post", action: `/room/${roomName}/choose-clue` }
      );
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, i: number, j: number) => {
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
      onFocusClue={(i, j) => {
        if (focusedClue && focusedClue[0] === i && focusedClue[1] === j) {
          return;
        }
        setFocusedClue(i, j);
      }}
      onKeyDownClue={handleKeyDown}
    />
  );
}
