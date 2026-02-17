import { describe, expect, it } from "vitest";

import type { WagerRecommendation, WagerStrategy } from "./wager-strategy";
import { getFinalClueStrategy } from "./wager-strategy";

/** Helper: extract just the amounts from recommendations. */
function amounts(strategy: WagerStrategy): number[] {
  return strategy.recommendations.map((r) => r.amount);
}

/** Helper: find a recommendation by label substring. */
function findRec(
  strategy: WagerStrategy,
  labelSubstring: string,
): WagerRecommendation | undefined {
  return strategy.recommendations.find((r) =>
    r.label.toLowerCase().includes(labelSubstring.toLowerCase()),
  );
}

describe("getFinalClueStrategy", () => {
  describe("solo player (no opponents)", () => {
    it("recommends wagering everything", () => {
      const result = getFinalClueStrategy(10000, []);
      expect(result.position).toBe("solo");
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].amount).toBe(10000);
    });
  });

  describe("guard: non-positive score", () => {
    it("returns empty recommendations for score <= 0", () => {
      const result = getFinalClueStrategy(0, [5000]);
      expect(result.recommendations).toHaveLength(0);
    });

    it("returns empty recommendations for negative score", () => {
      const result = getFinalClueStrategy(-1000, [5000]);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe("leader", () => {
    it("runaway: recommends safe bet of $0", () => {
      // $20,000 vs $8,000 — leader has more than double
      const result = getFinalClueStrategy(20000, [8000]);
      expect(result.position).toBe("leader");
      const safeBet = findRec(result, "safe");
      expect(safeBet).toBeDefined();
      expect(safeBet!.amount).toBe(0);
    });

    it("non-runaway: recommends cover bet", () => {
      // $20,000 vs $11,000 — cover bet = 2×11000 + 1 - 20000 = $2,001
      const result = getFinalClueStrategy(20000, [11000]);
      expect(result.position).toBe("leader");
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(2001);
    });

    it("barely ahead: recommends large cover bet", () => {
      // $20,000 vs $19,000 — cover bet = 2×19000 + 1 - 20000 = $18,001
      const result = getFinalClueStrategy(20000, [19000]);
      expect(result.position).toBe("leader");
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(18001);
    });

    it("tied with second: cover bet clamps to full score", () => {
      // Tied at $15,000: cover bet = 2×15000 + 1 - 15000 = $15,001 → clamped to $15,000
      const result = getFinalClueStrategy(15000, [15000]);
      expect(result.position).toBe("leader");
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(15000);
    });

    it("Emma Boettcher example: cover bet = $20,201", () => {
      // Emma: $26,600 vs James: $23,400 vs Jay: $11,000
      // Cover bet = 2 × $23,400 + 1 - $26,600 = $20,201
      const result = getFinalClueStrategy(26600, [23400, 11000]);
      expect(result.position).toBe("leader");
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(20201);
    });

    it("leader with 3 opponents uses highest opponent score", () => {
      const result = getFinalClueStrategy(20000, [12000, 8000, 5000]);
      expect(result.position).toBe("leader");
      // Cover bet based on highest opponent: 2×12000 + 1 - 20000 = $4,001
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(4001);
    });

    it("runaway also offers cover bet if positive", () => {
      // $20,000 vs $9,000 — runaway (20000 > 18000)
      // cover bet = 2×9000 + 1 - 20000 = -1999 → clamped to $0
      // In this case, safe and cover are both $0, so only safe should appear (dedup)
      const result = getFinalClueStrategy(20000, [9000]);
      expect(result.position).toBe("leader");
      expect(amounts(result)).toContain(0);
    });
  });

  describe("second place", () => {
    it("crush scenario (ratio < 2/3): recommends all-in", () => {
      // $7,000 vs $12,000 — ratio = 0.583 < 2/3
      const result = getFinalClueStrategy(7000, [12000]);
      expect(result.position).toBe("second");
      const allIn = findRec(result, "all in");
      expect(allIn).toBeDefined();
      expect(allIn!.amount).toBe(7000);
    });

    it("two-thirds game (2/3 ≤ ratio < 3/4): recommends conservative bet", () => {
      // $9,000 vs $13,000 — ratio = 0.692, between 2/3 (0.667) and 3/4 (0.75)
      // Conservative bet = 3×9000 - 2×13000 = 27000 - 26000 = $1,000
      const result = getFinalClueStrategy(9000, [13000]);
      expect(result.position).toBe("second");
      const conservative = findRec(result, "conservative");
      expect(conservative).toBeDefined();
      expect(conservative!.amount).toBe(1000);
      // Also offers all-in
      const allIn = findRec(result, "all in");
      expect(allIn).toBeDefined();
    });

    it("three-quarters game (ratio ≥ 3/4): recommends competitive and safe bets", () => {
      // $10,000 vs $13,000 — ratio = 0.769, ≥ 3/4
      // Competitive bet = 2×(13000 - 10000) + 1 = $6,001
      // Safe bet = 3×10000 - 2×13000 = 30000 - 26000 = $4,000
      const result = getFinalClueStrategy(10000, [13000]);
      expect(result.position).toBe("second");
      const competitive = findRec(result, "competitive");
      expect(competitive).toBeDefined();
      expect(competitive!.amount).toBe(6001);
      const safe = findRec(result, "safe");
      expect(safe).toBeDefined();
      expect(safe!.amount).toBe(4000);
    });

    it("close game: competitive and safe bets differ", () => {
      // $12,000 vs $13,000 — ratio = 0.923
      // Competitive = 2×(13000-12000) + 1 = $2,001
      // Safe = 3×12000 - 2×13000 = 36000 - 26000 = $10,000
      const result = getFinalClueStrategy(12000, [13000]);
      expect(result.position).toBe("second");
      expect(findRec(result, "competitive")!.amount).toBe(2001);
      expect(findRec(result, "safe")!.amount).toBe(10000);
    });

    it("exactly at 2/3 boundary: treats as two-thirds game", () => {
      // ratio = 2/3 exactly
      const result = getFinalClueStrategy(10000, [15000]);
      expect(result.position).toBe("second");
      // 10000/15000 = 0.6667 ≥ 2/3, so two-thirds game
      const conservative = findRec(result, "conservative");
      expect(conservative).toBeDefined();
    });

    it("exactly at 3/4 boundary: treats as three-quarters game", () => {
      // ratio = 3/4 exactly
      const result = getFinalClueStrategy(9000, [12000]);
      expect(result.position).toBe("second");
      // 9000/12000 = 0.75, ≥ 3/4 so three-quarters game
      const competitive = findRec(result, "competitive");
      expect(competitive).toBeDefined();
    });
  });

  describe("third place", () => {
    it("far behind: recommends all-in", () => {
      // $3,000 vs [$20,000, $15,000]
      const result = getFinalClueStrategy(3000, [20000, 15000]);
      expect(result.position).toBe("third_or_lower");
      const allIn = findRec(result, "all in");
      expect(allIn).toBeDefined();
      expect(allIn!.amount).toBe(3000);
    });

    it("competitive third: offers safe bet if above targets", () => {
      // $8,000 vs [$10,000, $9,000]
      // Leader if wrong = 2×10000 - 2×9000 - 1 = $1,999
      // Second if wrong = 2×9000 - 2×8000 - 1 = $1,999
      // We're above both targets ($8,000 > $1,999) — recommend $0
      const result = getFinalClueStrategy(8000, [10000, 9000]);
      expect(result.position).toBe("third_or_lower");
      const safeBet = findRec(result, "safe");
      expect(safeBet).toBeDefined();
      expect(safeBet!.amount).toBe(0);
    });

    it("offers target bet when leader target is reachable", () => {
      // $7,000 vs [$10,000, $9,000]
      // Leader if wrong = 2×10000 - 2×9000 - 1 = $1,999
      // Second if wrong = 2×9000 - 2×7000 - 1 = $3,999
      // We're above both targets ($7,000 > $3,999 and $7,000 > $1,999)
      // So we should get a safe bet of $0
      const result = getFinalClueStrategy(7000, [10000, 9000]);
      expect(result.position).toBe("third_or_lower");
      const safeBet = findRec(result, "safe");
      expect(safeBet).toBeDefined();
      expect(safeBet!.amount).toBe(0);
    });

    it("also offers all-in as option", () => {
      const result = getFinalClueStrategy(5000, [20000, 15000]);
      expect(result.position).toBe("third_or_lower");
      expect(amounts(result)).toContain(5000);
    });
  });

  describe("edge cases", () => {
    it("two-player game: no third-place considerations", () => {
      const result = getFinalClueStrategy(15000, [20000]);
      expect(result.position).toBe("second");
      // ratio = 0.75, three-quarters game
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    it("four-player game: correct position detection", () => {
      // Scores: 20000, 15000, 10000, 8000 — we are 10000 (3rd)
      const result = getFinalClueStrategy(10000, [20000, 15000, 8000]);
      expect(result.position).toBe("third_or_lower");
    });

    it("all scores equal: leader with cover bet of $1", () => {
      const result = getFinalClueStrategy(10000, [10000, 10000]);
      expect(result.position).toBe("leader");
      // Cover bet = 2×10000 + 1 - 10000 = $10,001 → clamped to $10,000
      const coverBet = findRec(result, "cover");
      expect(coverBet).toBeDefined();
      expect(coverBet!.amount).toBe(10000);
    });

    it("amounts never exceed player score", () => {
      // Score $5,000, opponent $4,999 — cover = 2×4999 + 1 - 5000 = $4,999
      const result = getFinalClueStrategy(5000, [4999]);
      for (const rec of result.recommendations) {
        expect(rec.amount).toBeLessThanOrEqual(5000);
        expect(rec.amount).toBeGreaterThanOrEqual(0);
      }
    });

    it("amounts never go below 0", () => {
      const result = getFinalClueStrategy(30000, [5000]);
      for (const rec of result.recommendations) {
        expect(rec.amount).toBeGreaterThanOrEqual(0);
      }
    });

    it("ignores opponents with score <= 0 in otherScores", () => {
      // Only opponent has 0 score — effectively solo
      const result = getFinalClueStrategy(10000, [0, -500]);
      expect(result.position).toBe("solo");
    });

    it("deduplicates identical amounts", () => {
      // Any result should not have duplicate amounts
      const result = getFinalClueStrategy(20000, [9000]);
      const amts = amounts(result);
      const unique = [...new Set(amts)];
      expect(amts).toEqual(unique);
    });
  });
});
