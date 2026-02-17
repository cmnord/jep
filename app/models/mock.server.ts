import { readFile } from "fs/promises";

import { Convert } from "~/models/convert.server";
import type { Game } from "~/models/game.server";

/** Find the absolute path of the json directory.
 *
 * Note: Vercel doesn't include the json directory when using process.cwd() or
 * path.join(). The workaround is to use __dirname and concatenate the json
 * directory to it.
 */
const JSON_DIRECTORY = import.meta.dirname + "/../static";

const MOCK_FILE_PATH = JSON_DIRECTORY + "/mock.jep.json";

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
  const fileContents = await readFile(MOCK_FILE_PATH, "utf8");
  const game = Convert.toGame(fileContents);
  return { id: "mock", visibility: "PUBLIC", ...game };
}
