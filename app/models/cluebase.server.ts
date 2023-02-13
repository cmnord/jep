// https://cluebase.readthedocs.io/en/latest/#id3

import { Clue } from "./clue.server";
import { Game } from "./game.server";

/* Constants */

const NUM_CATEGORIES = 6;
const NUM_CLUES_PER_CATEGORY = 5;

interface CluebaseResponse<T> {
  status: string;
  data: T[];
}

interface CluebaseGame {
  id: number;
  episode_num: number;
  season_id: number;
  air_date: string; // YYYY-MM-DD
  notes: string;
  contestant1: number;
  contestant2: number;
  contestant3: number;
  winner: number;
  score1: number;
  score2: number;
  score3: number;
}

interface CluebaseCategory {
  category: string;
  clue_count: number;
}

interface CluebaseClue {
  id: number;
  game_id: number;
  value: number;
  daily_double: boolean;
  round: "J!" | "DJ!";
  category: string;
  clue: string;
  response: string;
}

const CLUEBASE_URL = "http://cluebase.lukelav.in";

/* Helpers */

const cluebaseResponseToClue = (clue: CluebaseClue): Clue => ({
  category: clue.category,
  clue: clue.clue,
  answer: clue.response,
  value: clue.value,
  isDailyDouble: clue.daily_double,
  isFinal: false, // No FJ round clues
});

/* Reads */

export async function fetchAllGames({
  limit = 50, // max 1000
  offset = 0,
  orderBy = "id",
  sort = "asc",
}: {
  limit?: number;
  offset?: number;
  orderBy?: keyof CluebaseGame;
  sort?: "asc" | "desc";
}): Promise<CluebaseGame[]> {
  const url = new URL(CLUEBASE_URL + "/games");
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());
  url.searchParams.set("orderBy", orderBy);
  url.searchParams.set("sort", sort);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (res.status !== 200) {
    throw new Error(res.statusText);
  }

  const json: CluebaseResponse<CluebaseGame> = await res.json();
  return json.data;
}

async function fetchCategories({
  limit = 50, // max 2000
  offset = 0,
}: {
  limit: number;
  offset: number;
}) {
  const url = new URL(CLUEBASE_URL + "/categories");
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (res.status !== 200) {
    throw new Error(res.statusText);
  }

  const json: CluebaseResponse<CluebaseCategory> = await res.json();
  return json.data;
}

async function fetchRandomClues({
  limit = 1, // max 100
  category,
  difficulty,
}: {
  limit: number;
  category?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}) {
  const url = new URL(CLUEBASE_URL + "/clues/random");
  url.searchParams.set("limit", limit.toString());
  if (category) {
    url.searchParams.set("category", category);
  }
  if (difficulty) {
    url.searchParams.set("difficulty", difficulty.toString());
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (res.status !== 200) {
    throw new Error(res.statusText);
  }

  const json: CluebaseResponse<CluebaseClue> = await res.json();
  if (json.data.length !== limit) {
    throw new Error(
      `expected ${limit} clues in category ${category}, but got ${json.data.length}`
    );
  }
  return json.data;
}

export async function fetchRandomCategories() {
  const randomOffset = Math.floor(Math.random() * 1987);
  const categories = await fetchCategories({
    limit: 2 * NUM_CATEGORIES + 1,
    offset: randomOffset,
  });
  return categories.map((c) => c.category.toLowerCase());
}

export async function fetchRandomGame({
  categories,
}: {
  categories: string[];
}): Promise<Game> {
  const game: Game = {
    boards: [
      {
        categories: categories.slice(0, NUM_CATEGORIES),
        clues: {},
      },
      {
        categories: categories.slice(NUM_CATEGORIES, NUM_CATEGORIES * 2),
        clues: {},
      },
      {
        categories: categories.slice(NUM_CATEGORIES * 2),
        clues: {},
      },
    ],
  };

  for (let j = 0; j < categories.length; j++) {
    const category = categories[j];
    // Fetch one difficult clue for FJ.
    const limit = j === categories.length ? 1 : NUM_CLUES_PER_CATEGORY;
    const difficulty = j === categories.length ? 5 : undefined;
    const cluebaseClues = await fetchRandomClues({
      category: category.toLowerCase(),
      limit,
      difficulty,
    });
    const clues = cluebaseClues.map(cluebaseResponseToClue);
    if (j < NUM_CATEGORIES) {
      game.boards[0].clues[category] = clues;
    } else if (j < NUM_CATEGORIES * 2) {
      game.boards[1].clues[category] = clues;
    } else {
      game.boards[2].clues[category] = clues;
    }
  }

  return game;
}
