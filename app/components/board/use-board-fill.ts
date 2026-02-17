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
 * useBoardFill manages the board fill animation.
 *
 * When `shouldShow` is false (e.g. PreviewRound), all cells are hidden.
 * When `shouldShow` becomes true (or is true on mount), the animation plays
 * if `shouldAnimate` is true. If `shouldAnimate` is false (e.g. clues already
 * answered), all cells are shown immediately without animation.
 */
export function useBoardFill(
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
  const hasAnimatedRef = React.useRef(false);

  React.useEffect(() => {
    if (!shouldShow) {
      // Reset for next round's animation
      hasAnimatedRef.current = false;
      setRevealedCategories(new Set());
      setRevealedClues(generateGrid(numRows, numCategories, false));
      setAnimating(false);
      return;
    }

    // shouldShow is true — start animation if we haven't already this round
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    // Skip animation if clues already answered (e.g. page refresh mid-round)
    if (!shouldAnimate) return;

    const frames = generateBoardFillFrames(numCategories, numRows);
    const cats = new Set<number>();
    const clues = generateGrid(numRows, numCategories, false);

    function applyFrame(frame: BoardCell[]) {
      for (const cell of frame) {
        if (cell.isCategory) {
          cats.add(cell.j);
        } else {
          clues[cell.i][cell.j] = true;
        }
      }
      setRevealedCategories(new Set(cats));
      setRevealedClues(clues.map((row) => [...row]));
    }

    // Reveal first frame immediately
    setAnimating(true);
    applyFrame(frames[0]);

    // Schedule remaining frames
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let f = 1; f < frames.length; f++) {
      timeouts.push(
        setTimeout(() => {
          applyFrame(frames[f]);
          if (f === frames.length - 1) {
            setAnimating(false);
          }
        }, f * FRAME_INTERVAL_MS),
      );
    }

    // Handle single-category boards (animation ends immediately)
    if (frames.length === 1) {
      setAnimating(false);
    }

    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }, [shouldShow, shouldAnimate, numCategories, numRows]);

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

  return { animating, isCategoryRevealed, isClueRevealed };
}
