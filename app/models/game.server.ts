import { Board } from "~/models/board.server";
import fs from "fs";
import path from "path";

export interface Game {
  boards: Board[];
}

export async function getMockGame(filename: string) {
  const fullPath = path.resolve(__dirname, "../app/static/" + filename);
  const file = await fs.promises.readFile(fullPath);
  const data = JSON.parse(file.toString());

  const game: Game = { boards: [] };

  for (const boardJson of data.boards) {
    const board: Board = {
      categories: boardJson.categories,
      clues: {},
    };
    let category: keyof typeof boardJson.clues;
    for (category in boardJson.clues) {
      const clues = boardJson.clues[category];
      if (clues) {
        board.clues[category] = clues.map((c: any) => ({
          category,
          clue: c.clue,
          answer: c.answer,
          value: c.value,
          isDailyDouble: false,
          isFinal: false,
        }));
      }
    }
    game.boards.push(board);
  }

  // TODO: set daily doubles

  return game;
}
