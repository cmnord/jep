import { canonicalJson, normalizeGame } from "./game-upload-contract";

// This migrates upload receipts onto existing games without reinserting them.
// Source ordering means the category/clue array order in the original JSON.
// Old rows have no explicit array-position columns, so reads cannot reliably
// reconstruct that order. Compare full multisets within each round instead,
// preserving duplicate counts and metadata. Normal API retries remain ordered.
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
