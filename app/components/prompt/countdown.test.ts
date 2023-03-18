import { expect } from "vitest";

import { shouldShowTick } from "./countdown";

describe("shouldShowTick", () => {
  interface TestCase {
    countdown: number;
    i: number;
    expected: boolean;
  }

  const testCases: TestCase[] = [
    { countdown: 5, i: 0, expected: true },
    { countdown: 5, i: 1, expected: true },
    { countdown: 5, i: 2, expected: true },
    { countdown: 5, i: 3, expected: true },
    { countdown: 5, i: 4, expected: true },
    { countdown: 5, i: 5, expected: true },
    { countdown: 5, i: 6, expected: true },
    { countdown: 5, i: 7, expected: true },
    { countdown: 5, i: 8, expected: true },

    { countdown: 4, i: 0, expected: false },
    { countdown: 4, i: 1, expected: true },
    { countdown: 4, i: 2, expected: true },
    { countdown: 4, i: 3, expected: true },
    { countdown: 4, i: 4, expected: true },
    { countdown: 4, i: 5, expected: true },
    { countdown: 4, i: 6, expected: true },
    { countdown: 4, i: 7, expected: true },
    { countdown: 4, i: 8, expected: false },

    { countdown: 3, i: 0, expected: false },
    { countdown: 3, i: 1, expected: false },
    { countdown: 3, i: 2, expected: true },
    { countdown: 3, i: 3, expected: true },
    { countdown: 3, i: 4, expected: true },
    { countdown: 3, i: 5, expected: true },
    { countdown: 3, i: 6, expected: true },
    { countdown: 3, i: 7, expected: false },
    { countdown: 3, i: 8, expected: false },

    { countdown: 2, i: 0, expected: false },
    { countdown: 2, i: 1, expected: false },
    { countdown: 2, i: 2, expected: false },
    { countdown: 2, i: 3, expected: true },
    { countdown: 2, i: 4, expected: true },
    { countdown: 2, i: 5, expected: true },
    { countdown: 2, i: 6, expected: false },
    { countdown: 2, i: 7, expected: false },
    { countdown: 2, i: 8, expected: false },

    { countdown: 1, i: 0, expected: false },
    { countdown: 1, i: 1, expected: false },
    { countdown: 1, i: 2, expected: false },
    { countdown: 1, i: 3, expected: false },
    { countdown: 1, i: 4, expected: true },
    { countdown: 1, i: 5, expected: false },
    { countdown: 1, i: 6, expected: false },
    { countdown: 1, i: 7, expected: false },
    { countdown: 1, i: 8, expected: false },

    { countdown: 0, i: 0, expected: false },
    { countdown: 0, i: 1, expected: false },
    { countdown: 0, i: 2, expected: false },
    { countdown: 0, i: 3, expected: false },
    { countdown: 0, i: 4, expected: false },
    { countdown: 0, i: 5, expected: false },
    { countdown: 0, i: 6, expected: false },
    { countdown: 0, i: 7, expected: false },
    { countdown: 0, i: 8, expected: false },
  ];

  for (const tc of testCases) {
    it(`should return ${tc.expected} when countdown is ${tc.countdown} and i is ${tc.i}`, () => {
      const result = shouldShowTick(tc.countdown, tc.i);
      expect(result).toBe(tc.expected);
    });
  }
});
