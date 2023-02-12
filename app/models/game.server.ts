import questions from "~/utils/questions.json";
import { Board } from "~/models/board.server";
import { Clue } from "~/models/clue.server";

const PROXY_URL = "https://corsanywhere.herokuapp.com/";

export interface Game {
  single: Board;
  double: Board;
  final: Clue;
}

type ApiResponse = ApiResponseError | ApiResponseGame;

interface ApiResponseError {
  message: string;
}

export interface ApiResponseClue {
  category: string;
  clue: string;
  /** answer is not in the form of a question. */
  answer: string;
  /** order is the order of when it was selected by the players and starts at 1. */
  order: number;
  value: number | "Daily Double";
}

interface ApiResponseGame {
  jeopardy: ApiResponseClue[];
  "double jeopardy": ApiResponseClue[];
  "final jeopardy": ApiResponseClue;
}

const apiResponseToClue = (
  apiClue: ApiResponseClue,
  isFinal?: boolean
): Clue => ({
  category: apiClue.category,
  clue: apiClue.clue,
  answer: apiClue.answer,
  value: apiClue.value === "Daily Double" ? 0 : apiClue.value,
  isDailyDouble: apiClue.value === "Daily Double",
  isFinal: Boolean(isFinal),
});

export function cluesToBoard(apiClues: ApiResponseClue[]): Board {
  const categoryToIdx = new Map<string, number>();
  const clues: Clue[][] = [];

  apiClues.forEach((apiClue) => {
    const clue = apiResponseToClue(apiClue);
    let categoryIdx = categoryToIdx.get(apiClue.category);
    if (categoryIdx === undefined) {
      clues.push([]);
      categoryIdx = clues.length - 1;
      categoryToIdx.set(apiClue.category, clues.length - 1);
    }
    clues[categoryIdx].push(clue);
  });

  // Transpose: row of one value, columns of one category
  const rows = clues.length;
  const cols = clues[0].length;
  const transposedClues = [];
  for (let j = 0; j < cols; j++) {
    transposedClues[j] = Array(rows);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      transposedClues[j][i] = clues[i][j];
    }
  }

  return {
    categories: Array.from(categoryToIdx.keys()),
    clues: transposedClues,
  };
}

function strTo2Digits(str: string) {
  return parseInt(str, 10).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}

export async function fetchGame(
  yearStr: string,
  monthStr: string,
  dayStr: string
): Promise<Game> {
  const year = strTo2Digits(yearStr);
  const month = strTo2Digits(monthStr);
  const day = strTo2Digits(dayStr);

  // must be in MM-DD-YYYY format
  const apiUrl = `https://jarchive-json.glitch.me/game/${month}/${day}/${year}`;

  const apiResponseToGame = (apiResponse: ApiResponseGame): Game => ({
    single: cluesToBoard(apiResponse.jeopardy),
    double: cluesToBoard(apiResponse["double jeopardy"]),
    final: apiResponseToClue(apiResponse["final jeopardy"], true),
  });

  const response = await fetch(PROXY_URL + apiUrl);
  if (response.ok) {
    const answers: ApiResponse = await response.json();
    if ("message" in answers) {
      throw new Error(answers.message);
    }
    return apiResponseToGame(answers);
  }

  throw new Error(response.statusText);
}

export function getMockGame(): Game {
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
  game.single.clues[2][2].isDailyDouble = true;
  game.double.clues[2][2].isDailyDouble = true;
  game.double.clues[3][3].isDailyDouble = true;

  return game;
}
