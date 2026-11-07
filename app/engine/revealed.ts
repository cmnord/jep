import type { Board } from "~/models/convert.server";

import type { RevealedAnswer } from "./state";

type Revealed = ReadonlyMap<string, RevealedAnswer>;

const cache = new WeakMap<
  Board,
  { round: number; revealed: Revealed; result: Board }
>();

/** withRevealedAnswers fills in the answers the server revealed (host mode,
 * feature 22) on a board whose answers were withheld from this visitor (an
 * empty `answer`; every real answer is non-empty). The result is cached per
 * board and revealed map, so components get stable objects between renders. */
export function withRevealedAnswers(
  board: Board | undefined,
  round: number,
  revealed: Revealed,
): Board | undefined {
  if (!board || revealed.size === 0) return board;
  const cached = cache.get(board);
  if (cached && cached.round === round && cached.revealed === revealed) {
    return cached.result;
  }
  let changed = false;
  const categories = board.categories.map((category, j) => {
    let categoryChanged = false;
    const clues = category.clues.map((clue, i) => {
      const reveal = revealed.get(`${round},${i},${j}`);
      if (!reveal || clue.answer) return clue;
      changed = categoryChanged = true;
      return {
        ...clue,
        answer: reveal.answer,
        ...(reveal.answerMedia ? { answerMedia: reveal.answerMedia } : {}),
      };
    });
    return categoryChanged ? { ...category, clues } : category;
  });
  const result = changed ? { ...board, categories } : board;
  cache.set(board, { round, revealed, result });
  return result;
}
