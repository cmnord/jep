import { canonicalJson, normalizeGame } from "./game-upload-contract";

// Used by scripts/game-upload-admin.ts to attach receipts to existing games.
// Old rows lost category/clue ordering: compare multisets within each round,
// preserving duplicates and metadata. Normal API retries remain ordered.
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
