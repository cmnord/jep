import * as React from "react";

import { generateGrid } from "~/utils";

interface BoardCell {
  i: number;
  j: number;
  isCategory: boolean;
}

export interface BoardFillState {
  animating: boolean;
  isCategoryRevealed: (j: number) => boolean;
  isClueRevealed: (i: number, j: number) => boolean;
}

const FRAME_INTERVAL_MS = 400;

/** Fisher-Yates shuffle (in-place). */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Generate N frames for the board fill animation.
 * Each frame reveals 1 random category and ceil(totalClues / N) random clues.
 */
export function generateBoardFillFrames(
  numCategories: number,
  numRows: number,
): BoardCell[][] {
  const totalClues = numCategories * numRows;
  const cluesPerFrame = Math.ceil(totalClues / numCategories);

  // Shuffle category reveal order
  const categoryOrder = Array.from({ length: numCategories }, (_, i) => i);
  shuffleArray(categoryOrder);

  // Shuffle all clue positions
  const allClues: BoardCell[] = [];
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCategories; j++) {
      allClues.push({ i, j, isCategory: false });
    }
  }
  shuffleArray(allClues);

  // Build frames
  const frames: BoardCell[][] = [];
  for (let f = 0; f < numCategories; f++) {
    const frame: BoardCell[] = [
      { i: -1, j: categoryOrder[f], isCategory: true },
    ];
    const start = f * cluesPerFrame;
    const end = Math.min(start + cluesPerFrame, totalClues);
    for (let c = start; c < end; c++) {
      frame.push(allClues[c]);
    }
    frames.push(frame);
  }

  return frames;
}

/**
 * Manages board fill reveal state for category headers and clue cells.
 *
 * @param round Logical board epoch. A round change starts a fresh fill cycle,
 * even if the board shape is unchanged.
 * @param numCategories Number of category columns in the current board.
 * @param numRows Maximum clue rows across categories in the current board.
 * @param shouldShow Whether the board is currently visible. When `false`
 * (for example `PreviewRound`), all cells remain hidden.
 * @param shouldAnimate Whether to animate reveal when shown. When `false`
 * (for example resuming with answered clues), everything is revealed
 * immediately.
 * @returns Reveal state and helpers for category/clue visibility checks.
 *
 * @remarks
 * The internal effect re-runs on
 * `[round, shouldShow, shouldAnimate, numCategories, numRows]`.
 * The animation is therefore re-initialized when round, visibility, animation
 * mode, or board dimensions change.
 */
export function useBoardFill(
  round: number,
  numCategories: number,
  numRows: number,
  shouldShow: boolean,
  shouldAnimate: boolean,
): BoardFillState {
  const [revealedCategories, setRevealedCategories] = React.useState<
    Set<number>
  >(() => new Set());
  const [revealedClues, setRevealedClues] = React.useState<boolean[][]>(() =>
    generateGrid(numRows, numCategories, false),
  );
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function cleanup() {
      cancelled = true;
      for (const t of timeouts) clearTimeout(t);
    }

    if (!shouldShow) {
      setAnimating(false);
      setRevealedCategories(new Set<number>());
      setRevealedClues(generateGrid(numRows, numCategories, false));
      return cleanup;
    }

    if (!shouldAnimate) {
      setAnimating(false);
      setRevealedCategories(
        new Set(Array.from({ length: numCategories }, (_, j) => j)),
      );
      setRevealedClues(generateGrid(numRows, numCategories, true));
      return cleanup;
    }

    if (numCategories === 0 || numRows === 0) {
      setAnimating(false);
      setRevealedCategories(new Set<number>());
      setRevealedClues(generateGrid(numRows, numCategories, true));
      return cleanup;
    }

    setAnimating(true);
    setRevealedCategories(new Set<number>());
    const clues = generateGrid(numRows, numCategories, false);
    setRevealedClues(clues.map((row) => [...row]));

    const frames = generateBoardFillFrames(numCategories, numRows);
    const cats = new Set<number>();

    function applyFrame(frame: BoardCell[]) {
      if (cancelled) return;

      for (const cell of frame) {
        if (cell.isCategory) {
          cats.add(cell.j);
        } else if (clues[cell.i]) {
          clues[cell.i][cell.j] = true;
        }
      }

      setRevealedCategories(new Set(cats));
      setRevealedClues(clues.map((row) => [...row]));
    }

    applyFrame(frames[0]);

    for (let f = 1; f < frames.length; f++) {
      timeouts.push(
        setTimeout(() => {
          applyFrame(frames[f]);
          if (f === frames.length - 1 && !cancelled) {
            setAnimating(false);
          }
        }, f * FRAME_INTERVAL_MS),
      );
    }

    if (frames.length === 1) {
      setAnimating(false);
    }

    return cleanup;
  }, [round, shouldShow, shouldAnimate, numCategories, numRows]);

  const isCategoryRevealed = React.useCallback(
    (j: number) => {
      if (!shouldShow) return false;
      return !animating || revealedCategories.has(j);
    },
    [shouldShow, animating, revealedCategories],
  );

  const isClueRevealed = React.useCallback(
    (i: number, j: number) => {
      if (!shouldShow) return false;
      return !animating || (revealedClues[i]?.[j] ?? true);
    },
    [shouldShow, animating, revealedClues],
  );

  return {
    animating,
    isCategoryRevealed,
    isClueRevealed,
  };
}
