import { db } from "~/db.server";
import type { Board, Game as ConvertedGame } from "~/models/convert.server";
import type { Database } from "~/models/database.types";

/* Types */

/** Game is the representation of a game within the game engine. */
export type Game = { id: string } & ConvertedGame;

export type GameVisibility = Database["public"]["Enums"]["game_visibility"];

type GameTable = Database["public"]["Tables"]["games"];
type DbGame = GameTable["Row"];

type CategoryTable = Database["public"]["Tables"]["categories"];
type DbCategory = CategoryTable["Row"];

type ClueTable = Database["public"]["Tables"]["clues"];
type DbClue = ClueTable["Row"];

type CategoryAndClues = DbCategory & { clues: DbClue[] | null };
type GameAndClues = DbGame & { categories: CategoryAndClues[] | null };

const SEARCHABLE_GAME_COLUMNS = ["title", "author"];

/* Helpers */

function dbGameToGame(dbGame: GameAndClues): Game {
  const game: Game = {
    id: dbGame.id,
    author: dbGame.author,
    title: dbGame.title,
    copyright: dbGame.copyright ?? "",
    note: dbGame.note ?? "",
    boards: [],
  };

  const boardsMap = new Map<number, Board>();

  if (!dbGame.categories) {
    throw new Error("game must have at least one category");
  }

  for (const category of dbGame.categories) {
    if (!category.clues) {
      throw new Error("category must have at least one clue");
    }
    const round = category.round;
    const board = boardsMap.get(round) ?? { categories: [], categoryNames: [] };
    if (!boardsMap.has(round)) {
      boardsMap.set(round, board);
    }
    board.categories.push({
      ...category,
      note: category.note ?? undefined,
      clues: category.clues.map((clue) => ({
        ...clue,
        longForm: clue.long_form,
      })),
    });
    board.categoryNames.push(category.name);
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
        if (clue.longForm && !clue.wagerable) {
          throw new Error(
            "long-form clue " +
              i +
              " in category " +
              j +
              " must also be wagerable"
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
    .select<"*, categories ( *, clues ( * ) )", GameAndClues>(
      "*, categories ( *, clues ( * ) )"
    )
    .eq("id", gameId)
    .order("created_at", { foreignTable: "categories" })
    .order("value", { foreignTable: "categories.clues" });

  if (error !== null) {
    throw new Error(error.message);
  }

  const gameAndClues = data.at(0);
  if (!gameAndClues) {
    return null;
  }

  return dbGameToGame(gameAndClues);
}

/** getAllGames gets all games from the database. Search searches the title and
 * author fields.
 */
export async function getAllGames(search: string | null): Promise<Game[]> {
  let query = db
    .from<"games", GameTable>("games")
    .select<"*, categories ( *, clues ( * ) )", GameAndClues>(
      "*, categories ( *, clues ( * ) )"
    )
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

  return data.map((gac) => dbGameToGame(gac));
}

/* Writes */

export async function createGame(
  inputGame: ConvertedGame,
  visibility: GameVisibility,
  uploadedByUserId?: string
) {
  validateGame(inputGame);

  const { data: gameData, error: gameErr } = await db
    .from<"games", GameTable>("games")
    .insert<GameTable["Insert"]>({
      author: inputGame.author,
      copyright: inputGame.copyright,
      note: inputGame.note,
      title: inputGame.title,
      visibility,
      uploaded_by: uploadedByUserId,
    })
    .select();

  if (gameErr !== null) {
    throw gameErr;
  }
  const game = gameData.at(0);
  if (!game) {
    throw new Error("game data response must not be null");
  }

  const categoriesToInsert: Omit<CategoryTable["Insert"], "id">[] = [];
  for (let round = 0; round < inputGame.boards.length; round++) {
    const board = inputGame.boards[round];
    for (const category of board.categories) {
      categoriesToInsert.push({
        game_id: game.id,
        name: category.name,
        round,
      });
    }
  }

  const { data: categoryData, error: categoryErr } = await db
    .from<"categories", CategoryTable>("categories")
    .insert<CategoryTable["Insert"]>(categoriesToInsert)
    .select();

  // TODO: createGame is not transactional, so if any category fails to insert
  // the game will still be created.
  if (categoryErr !== null) {
    throw categoryErr;
  }
  if (categoryData === null) {
    throw new Error("category data response must not be null");
  }

  const cluesToInsert: Omit<ClueTable["Insert"], "id">[] = [];
  for (let round = 0; round < inputGame.boards.length; round++) {
    const board = inputGame.boards[round];
    for (const category of board.categories) {
      for (const clue of category.clues) {
        const dbCategory = categoryData.find((c) => c.name === category.name);
        if (!dbCategory) {
          throw new Error(
            "category " + category.name + " not inserted into database"
          );
        }
        cluesToInsert.push({
          category_id: dbCategory.id,
          answer: clue.answer,
          clue: clue.clue,
          value: clue.value,
          wagerable: clue.wagerable ?? false,
          long_form: clue.longForm ?? false,
        });
      }
    }
  }

  const { data: cluesData, error: cluesErr } = await db
    .from<"clues", ClueTable>("clues")
    .insert<ClueTable["Insert"]>(cluesToInsert)
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
