import { describe, expect, it } from "vitest";

import fixture from "../../docs/fixtures/game-upload-v1.json";
import {
  canonicalJson,
  gameContentHash,
  normalizeGame,
} from "./game-upload-contract";
import { legacyGamesEquivalent } from "./game-upload-reconciliation";

describe("game upload v1", () => {
  it("pins canonical bytes and hash for external clients", () => {
    expect(normalizeGame(fixture.input)).toEqual(fixture.normalized);
    expect(canonicalJson(normalizeGame(fixture.input))).toBe(
      fixture.canonicalJson,
    );
    expect(gameContentHash(fixture.input)).toBe(fixture.contentHash);
    expect(gameContentHash(fixture.normalized)).toBe(fixture.contentHash);
  });
  it("keeps order significant for API retries but accepts legacy storage order", () => {
    const reordered = structuredClone(fixture.normalized);
    reordered.boards[0].categories[0].clues.reverse();
    expect(gameContentHash(reordered)).not.toBe(fixture.contentHash);
    expect(legacyGamesEquivalent(reordered, fixture.input)).toBe(true);
    reordered.boards[0].categories[0].clues[0].answer = "Changed";
    expect(legacyGamesEquivalent(reordered, fixture.input)).toBe(false);
  });
  it("rejects values that cannot be represented exactly by the database", () => {
    const changed = structuredClone(fixture.input);
    changed.boards[0].categories[0].clues[0].value = 1.5;
    expect(() => normalizeGame(changed)).toThrow();
    changed.boards[0].categories[0].clues[0].value =
      Number.MAX_SAFE_INTEGER + 1;
    expect(() => normalizeGame(changed)).toThrow();
  });
});
