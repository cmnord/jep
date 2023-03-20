import type { Board, Game as ConvertedGame } from "~/models/convert.server";
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

/** validateGame validates a game before inserting it into the database. */
function validateGame(game: ConvertedGame) {
  if (game.title.trim() === "") {
    throw new Error("title must not be empty");
  }
  if (game.author.trim() === "") {
    throw new Error("author must not be empty");
  }
  if (game.boards.length === 0) {
    throw new Error("game must have at least one board");
  }

  for (let round = 0; round < game.boards.length; round++) {
    const board = game.boards[round];
    if (board.categories.length === 0) {
      throw new Error("board " + round + " must have at least one category");
    }
    if (board.categoryNames.length === 0) {
      throw new Error(
        "board " + round + " must have at least one category name"
      );
    }
    if (board.categoryNames.length !== board.categories.length) {
      throw new Error("categoryNames and categories must have the same length");
    }
    if (new Set(board.categoryNames).size !== board.categoryNames.length) {
      throw new Error("categoryNames must not have duplicates");
    }
    for (let j = 0; j < board.categories.length; j++) {
      const category = board.categories[j];
      if (category.name !== board.categoryNames[j]) {
        throw new Error("category name must match categoryNames at index " + j);
      }
      if (category.name.trim() === "") {
        throw new Error("category name " + j + " must not be empty");
      }
      if (category.clues.length === 0) {
        throw new Error("category " + j + " must have at least one clue");
      }
      for (let i = 0; i < category.clues.length; i++) {
        const clue = category.clues[i];
        if (clue.clue.trim() === "") {
          throw new Error(
            "clue " + i + " in category " + j + " must not be empty"
          );
        }
        if (clue.answer.trim() === "") {
          throw new Error(
            "answer " + i + " in category " + j + " must not be empty"
          );
        }
      }
    }
  }
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

/* Writes */

export async function createGame(inputGame: ConvertedGame) {
  validateGame(inputGame);

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
          answer: clue.answer,
          clue: clue.clue,
          value: clue.value,
          wagerable: clue.wagerable ?? false,
        });
      }
    }
  }

  const { data: cluesData, error: cluesErr } = await db
    .from<"clues", ClueTable>("clues")
    .insert<ClueTable["Insert"]>(clues)
    .select();

  // TODO: createGame is not transactional, so if any clue fails to insert the
  // game will still be created.
  if (cluesErr !== null) {
    throw cluesErr;
  }
  if (cluesData === null) {
    throw new Error("clues data must not be null");
  }

  return game.id;
}
