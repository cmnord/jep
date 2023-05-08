import type { AuthSession } from "~/models/auth";
import type {
  Board,
  Category,
  Clue,
  Game as ConvertedGame,
} from "~/models/convert.server";
import { Convert } from "~/models/convert.server";
import type { Database } from "~/models/database.types";
import { getSupabase, getSupabaseAdmin } from "~/supabase";

/* Types */

type GameTable = Database["public"]["Tables"]["games"];
export type DbGame = GameTable["Row"];

/** Game is the representation of a game within the game engine. */
export type Game = ConvertedGame & Pick<DbGame, "id" | "visibility">;

export type GameVisibility = Database["public"]["Enums"]["game_visibility"];

type CategoryTable = Database["public"]["Tables"]["categories"];
type DbCategory = CategoryTable["Row"];

type ClueTable = Database["public"]["Tables"]["clues"];
type DbClue = ClueTable["Row"];

type CategoryAndClues = DbCategory & { clues: DbClue[] | null };
type GameAndClues = DbGame & { categories: CategoryAndClues[] | null };

/** SEARCHABLE_GAME_COLUMNS are the columns of {@link DbGame} that are searched
 * on in {@link getGames}.
 */
const SEARCHABLE_GAME_COLUMNS = ["title", "author"];
const RESULTS_PER_PAGE = 10;

/* Helpers */

function dbGameToGame(dbGame: GameAndClues): Game {
  const game: Game = {
    id: dbGame.id,
    author: dbGame.author,
    title: dbGame.title,
    copyright: dbGame.copyright ?? "",
    note: dbGame.note ?? "",
    boards: [],
    visibility: dbGame.visibility,
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

export function gameToJson(game: Game): string {
  const gameToConvert: ConvertedGame = {
    title: game.title,
    author: game.author,
    copyright: game.copyright,
    note: game.note,
    boards: game.boards.map((board) => ({
      ...board,
      categories: board.categories.map(
        (category): Category => ({
          name: category.name,
          note: category.note,
          clues: category.clues.map(
            (clue): Clue => ({
              clue: clue.clue,
              answer: clue.answer,
              value: clue.value,
              wagerable: clue.wagerable,
              longForm: clue.longForm,
            })
          ),
        })
      ),
    })),
  };

  return Convert.gameToJson(gameToConvert);
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

/** getPagination returns the from and to indices for the given page and page
 * size.
 *
 * @example getPagination(1, 20) // { from: 0, to: 19 }
 * @example getPagination(2, 20) // { from: 20, to: 39 }
 */
function getPagination(page: number, pageSize: number = RESULTS_PER_PAGE) {
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  return { from, to };
}

/* Reads */

/** getGame bypasses RLS and enforces permissions on the server side to get
 * unlisted games.
 */
export async function getGame(
  gameId: string,
  userId?: string
): Promise<Game | null> {
  const { data, error } = await getSupabaseAdmin()
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

  if (
    gameAndClues.visibility === "PRIVATE" &&
    gameAndClues.uploaded_by !== userId
  ) {
    return null;
  }

  return dbGameToGame(gameAndClues);
}

export async function getGamesForUser(
  userId: string,
  accessToken?: AuthSession["accessToken"]
) {
  const { data, error } = await getSupabase(accessToken)
    .from("games")
    .select()
    .eq("uploaded_by", userId)
    .order("created_at", { ascending: false });

  if (error !== null) {
    throw new Error(error.message);
  }

  return data;
}

/** getGames gets all games from the database. Search searches the title and
 * author fields (see {@link SEARCHABLE_GAME_COLUMNS}).
 */
export async function getGames(
  options: {
    page: number;
    search: string | null;
  },
  accessToken?: AuthSession["accessToken"]
): Promise<Game[]> {
  const { search, page } = options;
  const { from, to } = getPagination(page);

  let query = getSupabase(accessToken)
    .from<"games", GameTable>("games")
    .select<"*, categories ( *, clues ( * ) )", GameAndClues>(
      "*, categories ( *, clues ( * ) )"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search && search.trim() !== "") {
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
  uploadedByUserId?: string,
  accessToken?: AuthSession["accessToken"]
) {
  validateGame(inputGame);
  const client = getSupabase(accessToken);

  const { data: gameData, error: gameErr } = await client
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

  const categoriesToInsert: CategoryTable["Insert"][] = [];
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

  const { data: categoryData, error: categoryErr } = await client
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

  const cluesToInsert: ClueTable["Insert"][] = [];
  for (let round = 0; round < inputGame.boards.length; round++) {
    const board = inputGame.boards[round];
    for (const category of board.categories) {
      const dbCategory = categoryData.find((c) => c.name === category.name);
      if (!dbCategory) {
        throw new Error(
          "category " + category.name + " not inserted into database"
        );
      }
      for (const clue of category.clues) {
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

  const { error: cluesErr } = await client
    .from<"clues", ClueTable>("clues")
    .insert<ClueTable["Insert"]>(cluesToInsert);

  // TODO: createGame is not transactional, so if any clue fails to insert the
  // game will still be created.
  if (cluesErr !== null) {
    throw cluesErr;
  }

  return game.id;
}

export async function updateGameVisibility(
  gameId: string,
  visibility: GameVisibility,
  accessToken?: AuthSession["accessToken"]
) {
  const { data, error } = await getSupabase(accessToken)
    .from("games")
    .update({ visibility })
    .eq("id", gameId)
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const game = data.at(0);
  if (!game) {
    throw new Error("game data response must not be null");
  }

  return game;
}

export async function deleteGame(
  gameId: string,
  accessToken?: AuthSession["accessToken"]
) {
  const { data, error } = await getSupabase(accessToken)
    .from("games")
    .delete()
    .eq("id", gameId)
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const game = data.at(0);
  if (!game) {
    throw new Error("game data response must not be null");
  }

  return game;
}
