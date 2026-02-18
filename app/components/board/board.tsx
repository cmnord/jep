import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import type { Board, Clue } from "~/models/convert.server";
import { generateGrid } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";
import useGameSound from "~/utils/use-sound";

import { Category } from "./category";
import { ClueComponent } from "./clue";
import { FinalClue } from "./final-clue";
import { useBoardFill } from "./use-board-fill";

const WAGER_SFX = "/sounds/wager.mp3";

/** BoardComponent is purely presentational and renders the board. */
function BoardComponent({
  board,
  hasBoardControl,
  isAnswered,
  isCategoryRevealed,
  isClueRevealed,
  onClickClue,
  onFocusClue,
  onKeyDownClue,
  tbodyRef,
}: {
  board: Board;
  hasBoardControl: boolean;
  isAnswered: (i: number, j: number) => boolean;
  isCategoryRevealed: (j: number) => boolean;
  isClueRevealed: (i: number, j: number) => boolean;
  onClickClue: (i: number, j: number) => void;
  onFocusClue: (i: number, j: number) => void;
  onKeyDownClue: (event: React.KeyboardEvent, i: number, j: number) => void;
  tbodyRef: React.RefObject<HTMLTableSectionElement | null>;
}) {
  // Transpose the clues so we can render them in a table.
  const numRows = Math.max(...board.categories.map((c) => c.clues.length));
  const numCols = board.categories.length;

  const rows = generateGrid<Clue | undefined>(numRows, numCols, undefined);

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const clue = board.categories.at(j)?.clues.at(i);
      if (clue) {
        rows[i][j] = clue;
      }
    }
  }

  return (
    <div className="w-full overflow-x-scroll">
      <div
        className="mx-auto max-w-screen-lg"
        style={{ minWidth: `${board.categoryNames.length * 50}px` }}
      >
        <table className="h-1 w-full table-fixed bg-blue-bright text-white">
          <thead>
            <tr className="h-1">
              {board.categories.map((category, j) => (
                <Category
                  key={category.name}
                  name={category.name}
                  note={category.note}
                  hidden={!isCategoryRevealed(j)}
                />
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {rows.map((category, i) => (
              <tr key={i}>
                {category.map((clue, j) =>
                  clue ? (
                    <ClueComponent
                      key={`clue-${i}-${j}`}
                      clue={clue}
                      answered={isAnswered(i, j)}
                      hasBoardControl={hasBoardControl}
                      hidden={!isClueRevealed(i, j)}
                      onFocus={() => onFocusClue(i, j)}
                      onClick={() => onClickClue(i, j)}
                      onKeyDown={(e) => onKeyDownClue(e, i, j)}
                    />
                  ) : (
                    <td key={`clue-${i}-${j}`} />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConnectedBoardComponent({ roomId, userId }: RoomProps) {
  const {
    board,
    boardControl,
    isAnswered,
    numAnswered,
    soloDispatch,
    type,
    round,
  } = useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  const [focusedClueIdx, setFocusedClue] = React.useState<[number, number]>();

  const numCategories = board?.categories.length ?? 0;
  const numRows = board
    ? Math.max(...board.categories.map((c) => c.clues.length))
    : 0;
  const shouldShowBoard = type !== GameState.PreviewRound;
  const shouldAnimate = numAnswered === 0;
  const { animating, isCategoryRevealed, isClueRevealed } = useBoardFill(
    round,
    numCategories,
    numRows,
    shouldShowBoard,
    shouldAnimate,
  );

  // Focus the tracked cell when the user navigates (focusedClueIdx changes)
  // or when the prompt closes and the board regains interaction (type becomes
  // ShowBoard). This restores keyboard position after answering a clue.
  React.useEffect(() => {
    if (type === GameState.ShowBoard && focusedClueIdx) {
      const [i, j] = focusedClueIdx;
      focusCell(i, j);
    }
  }, [focusedClueIdx, type]);

  const [playWagerSfx] = useGameSound(WAGER_SFX);

  if (!board) return null;

  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    Boolean(board.categories[0].clues[0].longForm);

  const hasBoardControl = boardControl === userId || isSingleLongFormClue;

  function focusCell(i: number, j: number) {
    const row = tbodyRef.current?.children.item(i);
    if (!row) {
      return;
    }
    const tdElement = row?.children.item(j);
    const cellButton = tdElement?.children.item(0);
    if (cellButton instanceof HTMLElement) {
      cellButton.focus();
    }
  }

  function handleClickClue(i: number, j: number) {
    const clue = board?.categories.at(j)?.clues.at(i);
    if (animating || isAnswered(i, j) || !clue || !hasBoardControl) {
      return;
    }
    if (clue.wagerable && !clue.longForm) {
      playWagerSfx();
    }
    return fetcher.submit(
      { i: i.toString(), j: j.toString(), userId },
      { method: "post", action: `/room/${roomId}/choose-clue` },
    );
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
        if (cellButton instanceof HTMLElement) {
          return cellButton.focus();
        }
        break;
      }
      case "s":
      case "ArrowDown": {
        const downTd = currentRow?.nextElementSibling?.children.item(j);
        const cellButton = downTd?.children.item(0);
        if (cellButton instanceof HTMLElement) {
          cellButton.focus();
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

  function handleFocusClue(i: number, j: number) {
    if (focusedClueIdx && focusedClueIdx[0] === i && focusedClueIdx[1] === j) {
      return;
    }
    setFocusedClue([i, j]);
  }

  if (isSingleLongFormClue) {
    return (
      <FinalClue
        category={board.categories[0].name}
        answered={isAnswered(0, 0)}
        onFocus={() => handleFocusClue(0, 0)}
        onClick={() => handleClickClue(0, 0)}
        onKeyDown={(e) => handleKeyDown(e, 0, 0)}
      />
    );
  }

  return (
    <BoardComponent
      board={board}
      tbodyRef={tbodyRef}
      hasBoardControl={!animating && hasBoardControl}
      isAnswered={isAnswered}
      isCategoryRevealed={isCategoryRevealed}
      isClueRevealed={isClueRevealed}
      onClickClue={handleClickClue}
      onFocusClue={handleFocusClue}
      onKeyDownClue={handleKeyDown}
    />
  );
}
