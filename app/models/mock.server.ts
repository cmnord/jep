import type { Game } from "~/models/game.server";

/**
 * MOCK_GAME has two rounds. Each round has 2 categories with 1 clue each.
 */
export const MOCK_GAME: Game = {
  id: "mock",
  title: "Mock Game",
  author: "",
  copyright: "",
  note: "",
  visibility: "PUBLIC",
  boards: [
    {
      categoryNames: ["Round 1, Category 1", "Round 1, Category 2"],
      categories: [
        {
          name: "Round 1, Category 1",
          clues: [{ clue: "a", answer: "b", value: 200 }],
        },
        {
          name: "Round 1, Category 2",
          clues: [{ clue: "c", answer: "d", value: 200 }],
        },
      ],
    },
    {
      categoryNames: ["Round 2, Category 1", "Round 2, Category 2"],
      categories: [
        {
          name: "Round 2, Category 1",
          clues: [{ clue: "e", answer: "f", value: 400, wagerable: true }],
        },
        {
          name: "Round 2, Category 2",
          clues: [
            {
              clue: "g",
              answer: "h",
              value: 400,
              wagerable: true,
              longForm: true,
            },
          ],
        },
      ],
    },
  ],
};

export async function getMockGame(): Promise<Game> {
  return MOCK_GAME;
}
