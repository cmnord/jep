import type { NextApiRequest, NextApiResponse } from "next";
import {
  cluesToBoard,
  GameResponse,
  Game,
  ApiResponseClue,
} from "./gameResponse";
import questions from "./questions.json";

export default async function mockGameResponse(
  req: NextApiRequest,
  res: NextApiResponse<GameResponse>
) {
  const { year: yearStr, month: monthStr, day: dayStr } = req.query;

  if (
    typeof yearStr !== "string" ||
    typeof monthStr !== "string" ||
    typeof dayStr !== "string"
  ) {
    res
      .status(405)
      .json({ error: true, message: "month/day/year not provided" });
    return;
  }

  const clues: ApiResponseClue[] = [];
  clues.push(
    ...questions.Delaware.map((question, i) => ({
      category: "Delaware",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    })),
    ...questions["Dolly Parton"].map((question, i) => ({
      category: "Dolly Parton",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    })),
    ...questions.Ferns.map((question, i) => ({
      category: "Ferns",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    })),
    ...questions["New York City"].map((question, i) => ({
      category: "New York City",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    })),
    ...questions["Pasta Shapes"].map((question, i) => ({
      category: "Pasta Shapes",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    })),
    ...questions["Dairy Products"].map((question, i) => ({
      category: "Dairy Products",
      clue: question.clue,
      answer: question.answer,
      order: 0,
      value: (i + 1) * 200,
      isDailyDouble: false,
    }))
  );

  const game: Game = {
    single: cluesToBoard(clues),
    double: cluesToBoard(clues),
    final: {
      category: "English Spelling",
      clue: "There are at least 50 common exceptions to the rule expressed by this popular rhyming mnemonic couplet",
      answer: "I before E, except after C",
      value: 0,
      isDailyDouble: false,
      isFinal: true,
    },
  };

  // Set some daily doubles
  game.single.categories[2].clues[2].isDailyDouble = true;
  game.double.categories[2].clues[2].isDailyDouble = true;
  game.double.categories[3].clues[3].isDailyDouble = true;

  res.status(200).json({ error: false, game });
}
