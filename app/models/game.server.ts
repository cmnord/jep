import questions from "~/utils/mock.jep.json";
import { Board } from "~/models/board.server";

export interface Game {
  boards: Board[];
}

export function getMockGame(): Game {
  const game: Game = { boards: [] };

  for (const boardJson of questions.boards) {
    const board: Board = {
      categories: boardJson.categories,
      clues: {},
    };
    let category: keyof typeof boardJson.clues;
    for (category in boardJson.clues) {
      const clues = boardJson.clues[category];
      if (clues) {
        board.clues[category] = clues.map(({ clue, answer, value }) => ({
          category,
          clue,
          answer,
          value,
          isDailyDouble: false,
          isFinal: false,
        }));
      }
    }
    game.boards.push(board);
  }

  // Set a daily double
  game.boards[0].clues["Delaware"][2].isDailyDouble = true;

  return game;
}
