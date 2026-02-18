import { GameSchema } from "~/models/convert.server";
import type { Game } from "~/models/game.server";
import data1x1 from "~/static/mock-1x1.jep.json";
import data3x3 from "~/static/mock-3x3.jep.json";
import defaultData from "~/static/mock-default.jep.json";
import dataLongForm from "~/static/mock-long-form.jep.json";
import dataWager from "~/static/mock-wager.jep.json";

function loadMockGame(data: unknown, id: string): Game {
  return { ...GameSchema.parse(data), id, visibility: "PUBLIC" };
}

/**
 * MOCK_GAME has two rounds. Each round has 2 categories with 1 clue each.
 */
export const MOCK_GAME = loadMockGame(defaultData, "mock");

const MOCK_GAMES: Record<string, Game> = {
  default: MOCK_GAME,
  "3x3": loadMockGame(data3x3, "mock-3x3"),
  "1x1": loadMockGame(data1x1, "mock-1x1"),
  wager: loadMockGame(dataWager, "mock-wager"),
  longForm: loadMockGame(dataLongForm, "mock-longForm"),
};

export async function getMockGame(name?: string): Promise<Game> {
  if (name && name in MOCK_GAMES) {
    return MOCK_GAMES[name];
  }
  return MOCK_GAME;
}
