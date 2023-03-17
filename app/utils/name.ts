import { POKE_NAMES, POSITIVE_ADJECTIVES } from "./name-lists";

export const positiveAdjectivesList =
  POSITIVE_ADJECTIVES.toLowerCase().split("\n");

export const pokeNamesList = POKE_NAMES.toLowerCase().split("\n");

function binarySearchChar(sortedArray: string[], char: string) {
  let left = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midVal = sortedArray[mid];

    if (midVal[0] < char) {
      left = mid + 1;
    } else if (midVal[0] > char) {
      right = mid - 1;
    } else {
      return mid;
    }
  }
}

function binarySearchRange(sortedArray: string[], char: string) {
  const idx = binarySearchChar(sortedArray, char);
  if (!idx) {
    return undefined;
  }

  let left = idx;
  let right = idx;
  while (sortedArray[left] && sortedArray[left][0] === char) {
    left = left - 1;
  }
  while (sortedArray[right] && sortedArray[right][0] === char) {
    right = right + 1;
  }
  return [left + 1, right];
}

/** randomInRange samples a number in the range [max, min). */
function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export function randomWordFromListStartingWithLetter(
  sortedArray: string[],
  char: string
) {
  const range = binarySearchRange(sortedArray, char);
  if (!range) {
    throw new Error("No adjectives starting with " + char);
  }

  const [start, end] = range;
  const randomIdx = randomInRange(start, end);

  return sortedArray[randomIdx];
}

function capitalize(s: string) {
  s = s.toLowerCase();
  s = s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
  return s;
}

/** getRandomName returns a random, alliterative name of Adjective + Noun. */
export function getRandomName() {
  const char = "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  const adjective = randomWordFromListStartingWithLetter(
    positiveAdjectivesList,
    char
  );
  const noun = randomWordFromListStartingWithLetter(pokeNamesList, char);

  return `${capitalize(adjective)} ${capitalize(noun)}`;
}
