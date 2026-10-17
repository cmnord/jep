// Version 1 wire contract. Keep dependency-light so upload clients can pin this
// module and convert.server.ts without loading the application or its secrets.
import { createHash } from "node:crypto";

import { GameSchema } from "./convert.server";

export function normalizeGame(input: unknown) {
  const game = GameSchema.parse(input);
  return {
    ...game,
    boards: game.boards.map((board) => ({
      ...board,
      categories: board.categories.map((category) => ({
        ...category,
        note: category.note ?? "",
        clues: category.clues.map((clue) => ({
          ...clue,
          wagerable: clue.wagerable ?? false,
          longForm: clue.longForm ?? false,
        })),
      })),
    })),
  };
}

// Object key order must not change equality or hashes; array order still matters.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// Clients verify this fingerprint before recording a successful upload receipt.
export function gameContentHash(input: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(normalizeGame(input)), "utf8")
    .digest("hex");
}
