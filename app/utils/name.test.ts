import { expect } from "vitest";

import {
  getRandomNameWithSample,
  pokeNamesList,
  positiveAdjectivesList,
  randomWordFromListStartingWithLetter,
} from "./name";

describe("randomWordFromListStartingWithLetter", () => {
  for (const char of "abcdefghijklmnopqrstuvwxyz") {
    for (let i = 0; i < 100; i++) {
      it(`adjectives list should return a random word starting with ${char}`, () => {
        const word = randomWordFromListStartingWithLetter(
          positiveAdjectivesList,
          char
        );
        expect(word).toBeDefined();
        if (!word.startsWith(char)) {
          throw new Error(word + " does not start with " + char);
        }
        expect(word.startsWith(char)).toBe(true);
      });

      it(`poke list should return a random word starting with ${char}`, () => {
        const word = randomWordFromListStartingWithLetter(pokeNamesList, char);
        expect(word).toBeDefined();
        if (!word.startsWith(char)) {
          throw new Error(word + " does not start with " + char);
        }
        expect(word.startsWith(char)).toBe(true);
      });
    }
  }
});

describe("getRandomNameWithSample", () => {
  it("should return a name starting with 'a' for sample 0", () => {
    const name = getRandomNameWithSample(0);
    expect(name).toBeDefined();
    expect(name[0]).toBe("A");
  });

  it("should return a name starting with 'z' for sample of almost 1", () => {
    const name = getRandomNameWithSample(1 - 1e-10);
    expect(name).toBeDefined();
    expect(name[0]).toBe("Z");
  });

  it("should return a name starting with some other character for sample of 0.5", () => {
    const name = getRandomNameWithSample(0.5);
    expect(name).toBeDefined();
    expect(name[0]).not.toBe("A");
    expect(name[0]).not.toBe("Z");
  });
});
