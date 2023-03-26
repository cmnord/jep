import { readFile } from "fs/promises";
import { Convert } from "./convert.server";

import type { Game } from "./game.server";

/** Find the absolute path of the json directory.
 *
 * Note: Vercel doesn't include the json directory when using process.cwd() or
 * path.join(). The workaround is to use __dirname and concatenate the json
 * directory to it.
 */
const JSON_DIRECTORY = __dirname + "/../app/static";

const MOCK_FILE_PATH = JSON_DIRECTORY + "/mock.jep.json";

/** MOCK_GAME has two rounds. The first round has 1 category with 2 clues and the
 * second round has 1 category with 1 clue.
 */
export const MOCK_GAME: Game = {
  id: "mock",
  title: "Mock Game",
  author: "",
  copyright: "",
  note: "",
  boards: [
    {
      categoryNames: ["Round 1, Category 1"],
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
      categoryNames: ["Round 2, Category 1"],
      categories: [
        {
          name: "Round 2, Category 1",
          clues: [{ clue: "e", answer: "f", value: 400, wagerable: true }],
        },
      ],
    },
  ],
};

export async function getMockGame(): Promise<Game> {
  const fileContents = await readFile(MOCK_FILE_PATH, "utf8");
  const game = Convert.toGame(fileContents);
  return { id: "mock", ...game };
}
