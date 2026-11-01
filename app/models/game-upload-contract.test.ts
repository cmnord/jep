import { describe, expect, it } from "vitest";

import fixture from "../../docs/fixtures/game-upload-v1.json";
import { GameSchema } from "./convert.server";
import {
  canonicalJson,
  gameContentHash,
  normalizeGame,
} from "./game-upload-contract";

describe("game upload v1", () => {
  it("pins canonical bytes and hash for external clients", () => {
    expect(normalizeGame(fixture.input)).toEqual(fixture.normalized);
    expect(canonicalJson(normalizeGame(fixture.input))).toBe(
      fixture.canonicalJson,
    );
    expect(gameContentHash(fixture.input)).toBe(fixture.contentHash);
    expect(gameContentHash(fixture.normalized)).toBe(fixture.contentHash);
  });
  it("keeps array order significant for API retries", () => {
    const reordered = structuredClone(fixture.normalized);
    reordered.boards[0].categories[0].clues.reverse();
    expect(gameContentHash(reordered)).not.toBe(fixture.contentHash);
  });
  it("rejects values that cannot be represented exactly by the database", () => {
    const changed = structuredClone(fixture.input);
    changed.boards[0].categories[0].clues[0].value = 1.5;
    expect(() => normalizeGame(changed)).toThrow();
    changed.boards[0].categories[0].clues[0].value =
      Number.MAX_SAFE_INTEGER + 1;
    expect(() => normalizeGame(changed)).toThrow();
  });
  it.each(["\0", "\uD800", "\uDFFF"])(
    "rejects database-invalid text %j throughout a game",
    (invalid) => {
      const changed = normalizeGame(fixture.input);
      changed.title += invalid;
      changed.author += invalid;
      changed.copyright += invalid;
      changed.note += invalid;
      changed.boards[0].categoryNames[0] += invalid;
      const category = changed.boards[0].categories[0];
      category.name += invalid;
      category.note += invalid;
      category.clues[0].clue += invalid;
      category.clues[0].answer += invalid;
      category.clues[0].imageSrc = `https://www.j-archive.com/${invalid}`;
      const parsed = GameSchema.safeParse(changed);
      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues.map(({ path }) => path.join("."))).toEqual(
        expect.arrayContaining([
          "title",
          "author",
          "copyright",
          "note",
          "boards.0.categoryNames.0",
          "boards.0.categories.0.name",
          "boards.0.categories.0.note",
          "boards.0.categories.0.clues.0.clue",
          "boards.0.categories.0.clues.0.answer",
          "boards.0.categories.0.clues.0.imageSrc",
        ]),
      );
    },
  );
  it("preserves valid Unicode including surrogate pairs", () => {
    const changed = { ...fixture.input, note: "Café 中文 🎉 \uD83D\uDE00\n" };
    expect(normalizeGame(changed).note).toBe(changed.note);
  });
});
