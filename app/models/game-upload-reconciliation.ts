import { canonicalJson, normalizeGame } from "./game-upload-contract";

// Legacy inserts did not retain source ordering. Reconciliation compares full
// category/clue multisets within each round, including duplicates and metadata.
// Normal API idempotency continues to compare ordered, normalized content.
export function legacyGamesEquivalent(existing: unknown, incoming: unknown) {
  function comparable(input: unknown) {
    const game = normalizeGame(input);
    return canonicalJson({
      ...game,
      boards: game.boards.map((board) => ({
        categories: board.categories
          .map((category) => ({
            ...category,
            clues: category.clues.map(canonicalJson).sort(),
          }))
          .map(canonicalJson)
          .sort(),
      })),
    });
  }
  return comparable(existing) === comparable(incoming);
}
