import type { NextApiRequest, NextApiResponse } from "next";

const PROXY_URL = "https://corsanywhere.herokuapp.com/";

export interface Clue {
  category: string;
  clue: string;
  /** answer is not in the form of a question. */
  answer: string;
  value: number;
  isDailyDouble: boolean;
  isFinal: boolean;
}

export interface Category {
  name: string;
  clues: Clue[];
}

export interface Board {
  categories: Category[];
}

export interface Game {
  single: Board;
  double: Board;
  final: Clue;
}

export type GameResponse =
  | {
      error: false;
      game?: Game;
    }
  | {
      error: true;
      message: string;
    };

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

export const cluesToBoard = (clues: ApiResponseClue[]): Board => {
  const categoryNames = new Map<string, Clue[]>();
  clues.forEach((clue) => {
    const cluesForCategory = categoryNames.get(clue.category);
    if (cluesForCategory) {
      categoryNames.set(clue.category, [
        ...cluesForCategory,
        apiResponseToClue(clue),
      ]);
    } else {
      categoryNames.set(clue.category, [apiResponseToClue(clue)]);
    }
  });

  const categories: Category[] = [];
  categoryNames.forEach((cluesForCategory, name) =>
    categories.push({ name, clues: cluesForCategory })
  );
  return {
    categories,
  };
};

export default async function gameResponse(
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

  const strTo2Digits = (str: string) =>
    parseInt(str, 10).toLocaleString("en-US", {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });

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

  await fetch(PROXY_URL + apiUrl)
    .then(async (response) => {
      if (response.ok) {
        const answers: ApiResponse = await response.json();
        if ("message" in answers) {
          res.status(404).json({ error: true, message: answers.message });
          return;
        }
        const game = apiResponseToGame(answers);
        res.status(200).json({ error: false, game });
      } else {
        res
          .status(response.status)
          .json({ error: true, message: response.statusText });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(405).end();
    });
}
