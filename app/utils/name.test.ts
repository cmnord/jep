import {
  pokeNamesList,
  positiveAdjectivesList,
  randomWordFromListStartingWithLetter,
} from "./name";

describe("getRandomName", () => {
  // adjective list does not have X
  for (const char of "abcdefghijklmnopqrstuvwyz") {
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
    }
  }
  for (const char of "abcdefghijklmnopqrstuvwxyz") {
    for (let i = 0; i < 100; i++) {
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
