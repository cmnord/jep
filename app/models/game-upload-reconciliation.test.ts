import { expect, it } from "vitest";

import fixture from "../../docs/fixtures/game-upload-v1.json";
import { legacyGamesEquivalent } from "./game-upload-reconciliation";

it("accepts legacy storage order but rejects changed content", () => {
  const reordered = structuredClone(fixture.normalized);
  reordered.boards[0].categories[0].clues.reverse();
  expect(legacyGamesEquivalent(reordered, fixture.input)).toBe(true);
  reordered.boards[0].categories[0].clues[0].answer = "Changed";
  expect(legacyGamesEquivalent(reordered, fixture.input)).toBe(false);
});
