import { State } from "~/engine";

/** getCoryat returns the player's score without any wagerable clues. If correct,
 * add the "natural" value of a clue in this row back in.
 */
export function getCoryat(userId: string, state: State) {
  const player = state.players.get(userId);
  if (!player) {
    return 0;
  }
  let score = player.score;

  for (const [roundKey, wagers] of state.wagers) {
    const wager = wagers.get(player.userId);
    if (!wager) {
      continue;
    }
    const [roundStr, iStr, jStr] = roundKey.split(",");
    const round = parseInt(roundStr);
    const i = parseInt(iStr);
    const j = parseInt(jStr);
    const clueAnswer = state.isAnswered.at(round)?.at(i)?.at(j);
    if (!clueAnswer) {
      continue;
    }
    const correct = clueAnswer.answeredBy.get(player.userId);
    if (correct === undefined) {
      continue;
    } else if (correct) {
      // Add the "natural" value of a clue in this row back in.
      const otherCategoriesInRound = state.game.boards
        .at(round)
        ?.categories.filter((_, categoryJ) => categoryJ !== j);

      const nonWagerableClueInRow = otherCategoriesInRound
        ?.map((category) => category.clues.at(i))
        .find((clue) => clue !== undefined && !clue.wagerable);

      const naturalClueValue = nonWagerableClueInRow?.value ?? 0;

      score -= wager;
      score += naturalClueValue;
    } else {
      score += wager;
    }
  }

  return score;
}
