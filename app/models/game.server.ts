import { readFile } from "fs/promises";

import type { Board, Game as ConvertedGame } from "~/models/convert.server";
import { Convert } from "~/models/convert.server";
import type { Database } from "~/models/database.types";
import { db } from "~/supabase.server";

/* Types */

/** Game is the representation of a game within the game engine. */
export type Game = { id: string } & ConvertedGame;

type GameTable = Database["public"]["Tables"]["games"];
type DbGame = GameTable["Row"];

type ClueTable = Database["public"]["Tables"]["clues"];
type DbClue = ClueTable["Row"];

type GameAndClues = DbGame & { clues: DbClue[] };

const SEARCHABLE_GAME_COLUMNS = ["title", "author"];

/* Helpers */

function dbGameToGame(dbGame: DbGame, clues: DbClue[]): Game {
  const game: Game = {
    id: dbGame.id,
    author: dbGame.author,
    title: dbGame.title,
    copyright: dbGame.copyright ?? "",
    note: dbGame.note ?? "",
    boards: [],
  };

  const boardsMap = new Map<number, Board>();

  for (const clue of clues) {
    const round = clue.round;
    const board = boardsMap.get(round) ?? { categories: [], categoryNames: [] };
    if (!boardsMap.has(round)) {
      boardsMap.set(round, board);
    }
    const categoryIdx = board.categoryNames.findIndex(
      (cn) => cn === clue.category
    );
    if (categoryIdx === -1) {
      board.categoryNames.push(clue.category);
      board.categories.push({ name: clue.category, clues: [clue] });
    } else {
      board.categories[categoryIdx].clues.push(clue);
    }
  }

  for (let round = 0; round < boardsMap.size; round++) {
    const board = boardsMap.get(round);
    if (!board) {
      throw new Error("boardsMap did not contain board for round " + round);
    }
    game.boards.push(board);
  }

  return game;
}

/* Reads */

export async function getGame(gameId: string): Promise<Game | null> {
  const { data, error } = await db
    .from<"games", GameTable>("games")
    .select<"*, clues ( * )", GameAndClues>("*, clues ( * )")
    .eq("id", gameId);

  if (error !== null) {
    throw new Error(error.message);
  }

  if (data.length === 0) {
    return null;
  }

  const gameAndClues = data[0];

  return dbGameToGame(gameAndClues, gameAndClues.clues);
}

/** getAllGames gets all games from the database. Search searches the title and
 * author fields.
 */
export async function getAllGames(search: string | null): Promise<Game[]> {
  let query = db
    .from<"games", GameTable>("games")
    .select<"*, clues ( * )", GameAndClues>("*, clues ( * )")
    .order("created_at", { ascending: false });

  if (search !== null && search.trim() !== "") {
    // .or doesn't accept variables, so sanitize the search string to prevent
    // SQL injection
    const sanitizedSearch = search.trim().replace(/[^a-zA-Z0-9\s]/g, "");
    const tokens = sanitizedSearch.split(/\s/);
    // Make a search clause for each searchable column. The tokens must all
    // match the same column.
    const clauses = [];
    for (const column of SEARCHABLE_GAME_COLUMNS) {
      // Make an ILIKE clause for every token.
      const tokenClauses = tokens.map((t) => `${column}.ilike.%${t}%`);
      const clause = `and(${tokenClauses.join(",")})`;
      clauses.push(clause);
    }
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query;

  if (error !== null) {
    throw new Error(error.message);
  }

  return data.map((gac) => dbGameToGame(gac, gac.clues));
}

export async function getMockGame(): Promise<Game> {
  // Find the absolute path of the json directory
  // Note: Vercel doesn't include the json directory when using process.cwd() or
  // path.join(). The workaround is to use __dirname and concatenate the json
  // directory to it.
  const jsonDirectory = __dirname + "/../app/static";
  // Read the json data file data.json
  const fileContents = await readFile(jsonDirectory + "/mock.jep.json", "utf8");

  const game = Convert.toGame(fileContents);
  return { id: "mock", ...game };
}

/* Writes */

export async function createGame(inputGame: ConvertedGame) {
  const { data: gameData, error: gameErr } = await db
    .from<"games", GameTable>("games")
    .insert<GameTable["Insert"]>({
      author: inputGame.author,
      copyright: inputGame.copyright,
      note: inputGame.note,
      title: inputGame.title,
    })
    .select();

  if (gameErr !== null) {
    throw gameErr;
  }
  if (gameData === null) {
    throw new Error("game data response must not be null");
  }

  const game = gameData[0];

  const clues: Omit<DbClue, "id">[] = [];
  for (let round = 0; round < inputGame.boards.length; round++) {
    const board = inputGame.boards[round];
    for (const category of board.categories) {
      for (const clue of category.clues) {
        clues.push({
          category: category.name,
          game_id: game.id,
          round,
          ...clue,
        });
      }
    }
  }

  const { data: cluesData, error: cluesErr } = await db
    .from<"clues", ClueTable>("clues")
    .insert<ClueTable["Insert"]>(clues)
    .select();

  if (cluesErr !== null) {
    throw cluesErr;
  }
  if (cluesData === null) {
    throw new Error("clues data must not be null");
  }

  return game.id;
}
