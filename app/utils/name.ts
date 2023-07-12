import { POKE_NAMES, POSITIVE_ADJECTIVES } from "./name-lists";

export const positiveAdjectivesList =
  POSITIVE_ADJECTIVES.toLowerCase().split("\n");

export const pokeNamesList = POKE_NAMES.toLowerCase().split("\n");

function makePdf(array: string[]) {
  const weights = new Map<string, number>();
  let totalCount = 0;

  for (const word of array) {
    const firstChar = word[0];
    const prevWeight = weights.get(firstChar);
    if (prevWeight) {
      weights.set(firstChar, prevWeight + 1);
    } else {
      weights.set(firstChar, 1);
    }
    totalCount++;
  }

  // Normalize weights by total count
  for (const [key, value] of weights) {
    weights.set(key, value / totalCount);
  }

  return Array.from(weights.entries())
    .sort(([a], [b]) => {
      if (a < b) return -1;
      if (a === b) return 0;
      return 1;
    })
    .map(([, weight]) => weight);
}

function makeCombinedPdf(...arrays: string[][]) {
  const pdfs = arrays.map((a) => makePdf(a));
  const len = pdfs[0].length;
  for (const pdf of pdfs) {
    if (pdf.length !== len) {
      throw new Error(
        `pdfs must be the same length ${len}, but one is ${pdfs.length}`,
      );
    }
  }

  const combinedPdf = new Array<number>(len);
  let totalCount = 0;

  for (let i = 0; i < len; i++) {
    const weightProduct = pdfs.reduce((acc, pdf) => acc * pdf[i], 1);
    combinedPdf[i] = weightProduct;
    totalCount += weightProduct;
  }

  // Normalize combined PDF by total count
  for (let i = 0; i < len; i++) {
    combinedPdf[i] = combinedPdf[i] / totalCount;
  }

  return combinedPdf;
}

/** LETTER_PDF is the probability distribution function of alliterative
 * (adjective, noun) combos by frequency.
 */
const LETTER_PDF = makeCombinedPdf(positiveAdjectivesList, pokeNamesList);

/** LETTER_CDF is the cumulative distribution function of LETTER_PDF. */
const LETTER_CDF = new Array<number>(LETTER_PDF.length);
for (let i = 0; i < LETTER_PDF.length; i++) {
  if (i === 0) {
    LETTER_CDF[i] = LETTER_PDF[i];
  } else {
    LETTER_CDF[i] = LETTER_CDF[i - 1] + LETTER_PDF[i];
  }
}

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
  char: string,
) {
  const range = binarySearchRange(sortedArray, char);
  if (!range) {
    throw new Error("No adjectives starting with " + char);
  }

  const [start, end] = range;
  const randomIdx = randomInRange(start, end);

  return sortedArray[randomIdx];
}

/** capitalize capitalizes the first letter of every word in the string. */
function capitalize(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** getRandomName returns a random, alliterative name of Adjective + Noun. */
export function getRandomName() {
  const sample = Math.random(); // sample is in the range [0, 1).
  return getRandomNameWithSample(sample);
}

export function getRandomNameWithSample(sample: number) {
  // Find the first letter where sample < LETTER_CDF[i]
  const char = "abcdefghijklmnopqrstuvwxyz".split("").find((_char, i) => {
    return sample < LETTER_CDF[i];
  });

  if (!char) {
    throw new Error("No letter found for sample " + sample);
  }

  const adjective = randomWordFromListStartingWithLetter(
    positiveAdjectivesList,
    char,
  );
  const noun = randomWordFromListStartingWithLetter(pokeNamesList, char);

  return `${capitalize(adjective)} ${capitalize(noun)}`;
}
