/**
 * Final clue wagering strategy recommendations.
 *
 * Implements established wagering strategies from the J! trivia community:
 *
 * Sources:
 * - Keith Williams / The Final Wager (thefinalwager.com/tutorial)
 *   The canonical reference for final clue wagering, by the 2003 College Champion.
 * - The J! Fan "Wagering Strategy 101" (thejeopardyfan.com/final-jeopardy-betting)
 *   Defines the breakpoint scenarios: lock, crush, two-thirds, three-quarters.
 * - FinalJeopardyWager.com — Three-step "targets" method for trailing players.
 * - jeopardy.com/jbuzz/behind-scenes/final-jeopardy-wagering-strategy
 *   Uses the Boettcher vs. Holzhauer game as the canonical cover bet example.
 * - J! Archive glossary — Standard breakpoint names and ratio thresholds.
 */

export type PlayerPosition = "leader" | "second" | "third_or_lower" | "solo";

export interface WagerRecommendation {
  /** Human-readable label for the strategy. */
  label: string;
  /** The recommended wager amount, clamped to [0, playerScore]. */
  amount: number;
  /** Brief explanation of why this wager is recommended. */
  reason: string;
}

export interface WagerStrategy {
  position: PlayerPosition;
  recommendations: WagerRecommendation[];
}

/**
 * Computes final clue wager recommendations for the current player.
 *
 * @param myScore - The current player's score (must be > 0 to be wagering).
 * @param otherScores - Scores of all OTHER players who CAN wager (score > 0),
 *                      in any order. Players with score <= 0 should be excluded
 *                      before calling this function.
 * @returns A WagerStrategy with position assessment and 1-3 recommendations.
 */
export function getFinalClueStrategy(
  myScore: number,
  otherScores: number[],
): WagerStrategy {
  // Guard: should not be called with non-positive score
  if (myScore <= 0) {
    return { position: "solo", recommendations: [] };
  }

  const clamp = (n: number) => Math.max(0, Math.min(Math.round(n), myScore));

  // Filter and sort opponent scores descending
  const scores = otherScores.filter((s) => s > 0).sort((a, b) => b - a);

  // Solo player — no opponents wagering
  if (scores.length === 0) {
    return {
      position: "solo",
      recommendations: [
        {
          label: "Wager everything",
          amount: myScore,
          reason: "No opponents to worry about.",
        },
      ],
    };
  }

  const highestOpponent = scores[0];

  if (myScore >= highestOpponent) {
    return computeLeaderStrategy(myScore, scores, clamp);
  } else if (scores.length === 1 || myScore >= scores[1]) {
    return computeSecondStrategy(myScore, scores, clamp);
  } else {
    return computeThirdStrategy(myScore, scores, clamp);
  }
}

/**
 * Strategy for the leading player.
 *
 * Cover bet formula: 2 × secondScore + 1 - myScore
 * Source: Keith Williams / The Final Wager (thefinalwager.com/tutorial)
 * Example: Emma Boettcher bet $20,201 to cover James Holzhauer
 *          ($23,400 × 2 + 1 - $26,600 = $20,201)
 * Source: jeopardy.com/jbuzz/behind-scenes/final-jeopardy-wagering-strategy
 */
function computeLeaderStrategy(
  myScore: number,
  opponentScores: number[],
  clamp: (n: number) => number,
): WagerStrategy {
  const secondScore = opponentScores[0];
  const recommendations: WagerRecommendation[] = [];

  // Tied for the lead: no bet guarantees a win.
  // Source: Keith Williams / The Final Wager — "When tied, wager everything."
  // Rationale: if your opponent bets big and is correct, you need to match.
  // The trade-off is that betting $0 wins if both miss and opponent bet big.
  const isTied = myScore === secondScore;

  if (isTied) {
    recommendations.push({
      label: "Go all in",
      amount: myScore,
      reason:
        "You're tied. Bet everything — if your opponent bets big and is correct, you need to match.",
    });
    recommendations.push({
      label: "Bet nothing",
      amount: 0,
      reason:
        "If both miss and your opponent bet big, you win. But you lose if they're right and bet anything.",
    });
    return { position: "leader", recommendations: dedup(recommendations) };
  }

  // Cover bet: ensures you beat second place if both answer correctly and
  // second bets everything.
  const coverBet = clamp(2 * secondScore + 1 - myScore);

  // Runaway / Lock game: leader has more than double second place.
  // Source: The J! Fan (thejeopardyfan.com/final-jeopardy-betting)
  // "If your score is more than double the second-place player, you can
  // guarantee your win."
  const isRunaway = myScore > 2 * secondScore;

  if (isRunaway) {
    recommendations.push({
      label: "Safe bet",
      amount: 0,
      reason:
        "You have more than double second place. Bet $0 to guarantee the win.",
    });
    if (coverBet > 0) {
      recommendations.push({
        label: "Cover bet",
        amount: coverBet,
        reason:
          "Bet to stay ahead even if second place doubles up and is correct.",
      });
    }
  } else {
    recommendations.push({
      label: "Cover bet",
      amount: coverBet,
      reason:
        "If both you and second place answer correctly, you still win by $1.",
    });
  }

  return { position: "leader", recommendations: dedup(recommendations) };
}

/**
 * Strategy for the second-place player.
 *
 * Uses the standard breakpoint scenarios from J! Archive and
 * The J! Fan (thejeopardyfan.com/final-jeopardy-betting):
 *
 * - Crush (ratio < 2/3): Bet everything, your only hope is the leader misses.
 * - Two-thirds game (2/3 ≤ ratio < 3/4): Bet conservatively ($0 to 3×own - 2×leader).
 *   You can't pass the leader even if both right, so hope the leader misses.
 * - Three-quarters game (ratio ≥ 3/4): Bet competitively. You CAN pass the leader.
 *   Min bet to beat leader if both right: 2×(leader - own) + 1
 *   Max safe bet if both wrong: 3×own - 2×leader
 */
function computeSecondStrategy(
  myScore: number,
  opponentScores: number[],
  clamp: (n: number) => number,
): WagerStrategy {
  const leaderScore = opponentScores[0];
  const ratio = myScore / leaderScore;
  const recommendations: WagerRecommendation[] = [];

  if (ratio < 2 / 3) {
    // Crush scenario: bet everything.
    // Source: J! Archive — "the second-place player should bet everything"
    recommendations.push({
      label: "Go all in",
      amount: myScore,
      reason:
        "You need the leader to miss. Maximize your score for the best chance.",
    });
  } else if (ratio < 3 / 4) {
    // Two-thirds game: can't pass the leader even if both right.
    // Bet conservatively — stay ahead if both miss and leader bet to cover.
    // Source: The J! Fan (thejeopardyfan.com/final-jeopardy-betting)
    // Max safe bet: 3×own - 2×leader (keeps you ahead on a double stumper)
    const safeBet = clamp(3 * myScore - 2 * leaderScore);
    recommendations.push({
      label: "Conservative bet",
      amount: safeBet,
      reason:
        "You can't pass the leader if both right. Stay ahead if both miss.",
    });
    recommendations.push({
      label: "Go all in",
      amount: myScore,
      reason: "High-risk: maximizes your score if the leader also misses.",
    });
  } else {
    // Three-quarters game: you CAN pass the leader if both right.
    // Source: The J! Fan (thejeopardyfan.com/final-jeopardy-betting)
    // Competitive bet: minimum to beat leader if both right
    const competitiveBet = clamp(2 * (leaderScore - myScore) + 1);
    // Safe bet: maximum that stays ahead on a double stumper
    const safeBet = clamp(3 * myScore - 2 * leaderScore);

    recommendations.push({
      label: "Competitive bet",
      amount: competitiveBet,
      reason: "Minimum wager to beat the leader if you both answer correctly.",
    });
    if (safeBet !== competitiveBet) {
      recommendations.push({
        label: "Safe bet",
        amount: safeBet,
        reason:
          "Maximum wager that keeps you ahead if both you and the leader miss.",
      });
    }
  }

  return { position: "second", recommendations: dedup(recommendations) };
}

/**
 * Strategy for third place and lower.
 *
 * Uses the "targets" method from FinalJeopardyWager.com:
 * Step 1: Compute where opponents land if they answer incorrectly
 *         (their score minus their optimal cover bet).
 * Step 2: Those amounts are your "targets" — bet enough to reach targets
 *         above you, but not so much you fall below targets below you.
 */
function computeThirdStrategy(
  myScore: number,
  opponentScores: number[],
  clamp: (n: number) => number,
): WagerStrategy {
  const leaderScore = opponentScores[0];
  const secondScore =
    opponentScores.length > 1 ? opponentScores[1] : opponentScores[0];
  const recommendations: WagerRecommendation[] = [];

  // Where does the leader land if wrong? Leader's cover bet over second:
  // leaderCover = 2 × second + 1 - leader
  // Leader if wrong = leader - leaderCover = 2 × leader - 2 × second - 1
  const leaderIfWrong = 2 * leaderScore - 2 * secondScore - 1;

  // Where does second place land if wrong? Second's cover bet over us:
  // secondCover = 2 × myScore + 1 - secondScore
  // Second if wrong = second - secondCover = 2 × second - 2 × myScore - 1
  const secondIfWrong = 2 * secondScore - 2 * myScore - 1;

  if (myScore > leaderIfWrong && myScore > secondIfWrong) {
    // We're already above both targets — bet $0
    recommendations.push({
      label: "Safe bet",
      amount: 0,
      reason:
        "If both opponents miss with standard bets, you win without risking anything.",
    });
  }

  // Bet enough to beat the leader's "wrong" target
  if (leaderIfWrong >= myScore) {
    // Can't reach the target — just go all in
    recommendations.push({
      label: "Go all in",
      amount: myScore,
      reason:
        "You need opponents ahead to miss. Maximize your potential score.",
    });
  } else if (leaderIfWrong > 0) {
    const targetBet = clamp(leaderIfWrong + 1 - myScore);
    if (targetBet > 0) {
      recommendations.push({
        label: "Target bet",
        amount: targetBet,
        reason: "Bet enough to pass where the leader falls if they miss.",
      });
    }
  }

  // Fallback: always offer all-in if not already suggested
  if (!recommendations.some((r) => r.amount === myScore)) {
    recommendations.push({
      label: "Go all in",
      amount: myScore,
      reason:
        "You need opponents ahead to miss. Maximize your potential score.",
    });
  }

  return {
    position: "third_or_lower",
    recommendations: dedup(recommendations),
  };
}

/** Remove recommendations with duplicate amounts, keeping the first. */
function dedup(recs: WagerRecommendation[]): WagerRecommendation[] {
  const seen = new Set<number>();
  return recs.filter((r) => {
    if (seen.has(r.amount)) return false;
    seen.add(r.amount);
    return true;
  });
}
