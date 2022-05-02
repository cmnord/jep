import type { NextApiRequest, NextApiResponse } from "next";

const PROXY_URL = "https://corsanywhere.herokuapp.com/";

export interface Clue {
  category: string;
  clue: string;
  /** answer is not in the form of a question. */
  answer: string;
  /** order is the order of when it was selected by the players and starts at 1. */
  order: number;
  value: number | "Daily Double";
}

export interface Category {
  name: string;
  clues: Clue[];
}

export enum Round {
  Jeopardy,
  DoubleJeopardy,
  FinalJeopardy,
}

export interface Board {
  round: Round;
  categories: Category[];
}

export interface Game {
  jeopardy: Board;
  doubleJeopardy: Board;
  finalJeopardy: Clue;
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

interface ApiResponseGame {
  jeopardy: Clue[];
  "double jeopardy": Clue[];
  "final jeopardy": Clue;
}

export const cluesToBoard = (round: Round, clues: Clue[]): Board => {
  const categoryNames = new Map<string, Clue[]>();
  clues.forEach((clue) => {
    const clues = categoryNames.get(clue.category);
    if (clues) {
      categoryNames.set(clue.category, [...clues, clue]);
    } else {
      categoryNames.set(clue.category, [clue]);
    }
  });

  const categories: Category[] = [];
  categoryNames.forEach((clues, name) => categories.push({ name, clues }));
  return {
    round,
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

  const strTo2Digits = (str: string) => {
    return parseInt(str, 10).toLocaleString("en-US", {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
  };

  const year = strTo2Digits(yearStr);
  const month = strTo2Digits(monthStr);
  const day = strTo2Digits(dayStr);

  // must be in MM-DD-YYYY format
  const apiUrl = `https://jarchive-json.glitch.me/game/${month}/${day}/${year}`;

  const apiResponseToGame = (apiResonse: ApiResponseGame): Game => ({
    jeopardy: cluesToBoard(Round.Jeopardy, apiResonse.jeopardy),
    doubleJeopardy: cluesToBoard(
      Round.DoubleJeopardy,
      apiResonse["double jeopardy"]
    ),
    finalJeopardy: apiResonse["final jeopardy"],
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
        return;
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
