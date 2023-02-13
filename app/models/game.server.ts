import { Board } from "~/models/board.server";
import fs from "fs";
import path from "path";
import { Clue } from "./clue.server";

export interface Game {
  boards: Board[];
}

function toObject(d: unknown, name: string) {
  if (typeof d !== "object") {
    throw new Error(`data '${name}' must be an object, but is ${typeof d}`);
  }
  if (d === null) {
    throw new Error(`data '${name}' must not be null`);
  }
  return d;
}

function isArray(d: unknown): d is unknown[] {
  return Array.isArray(d);
}

function toArray(d: unknown, name: string) {
  if (isArray(d)) {
    return d;
  }
  throw new Error(`data '${name}' must be an array`);
}

function toString(d: unknown, name: string) {
  if (typeof d !== "string") {
    throw new Error(`data '${name}' must be a string, but is ${typeof d}`);
  }
  return d;
}

function toNumber(d: unknown, name: string) {
  if (typeof d !== "number") {
    throw new Error(`data '${name}' must be a string, but is ${typeof d}`);
  }
  return d;
}

function toClue(d: unknown, categoryName: string, name: string): Clue {
  const clueJson = toObject(d, name);

  if (!("clue" in clueJson)) {
    throw new Error(`${name} must have key "clue"`);
  }
  const clue = toString(clueJson.clue, name + ".clue");

  if (!("answer" in clueJson)) {
    throw new Error(`${name} must have key "answer"`);
  }
  const answer = toString(clueJson.answer, name + ".answer");

  if (!("value" in clueJson)) {
    throw new Error(`${name} must have key "value"`);
  }
  const value = toNumber(clueJson.value, name + ".value");

  return {
    category: categoryName,
    clue,
    answer,
    value,
    isDailyDouble: false,
    isFinal: false,
  };
}

function toCategory(d: unknown, name: string) {
  const categoryJson = toObject(d, name);
  if (!("clues" in categoryJson)) {
    throw new Error(`${name} must have key "clues"`);
  }
  if (!("name" in categoryJson)) {
    throw new Error(`${name} must have key "name"`);
  }
  const categoryName = toString(categoryJson.name, name + ".name");
  const cluesJson = toArray(categoryJson.clues, name + ".clues");

  const clues = [];
  for (let i = 0; i < cluesJson.length; i++) {
    const clue = toClue(cluesJson[i], categoryName, name + `.clues[${i}]`);
    clues.push(clue);
  }

  return { name: categoryName, clues };
}

function toBoard(d: unknown, name: string): Board {
  const boardJson = toObject(d, name);
  if (!("categoryNames" in boardJson)) {
    throw new Error(`${name} must have key "categoryNames"`);
  }
  if (!("categories" in boardJson)) {
    throw new Error(`${name} must have key "categoryNames"`);
  }

  const categoryNamesJson = toArray(
    boardJson.categoryNames,
    name + ".categoryName"
  );
  const categoryNames: string[] = [];

  for (let j = 0; j < categoryNamesJson.length; j++) {
    const categoryName = toString(
      categoryNamesJson[j],
      name + `.categoryName[${j}]`
    );
    categoryNames.push(categoryName);
  }

  const categoriesJson = toArray(boardJson.categories, name + ".categories");
  const categories = [];

  for (let j = 0; j < categoriesJson.length; j++) {
    const category = toCategory(categoriesJson[j], name + `.categories[${j}]`);
    categories.push(category);
  }

  return {
    categoryNames,
    categories,
  };
}

export async function getMockGame(filename: string) {
  const fullPath = path.resolve(__dirname, "../app/static/" + filename);
  const file = await fs.promises.readFile(fullPath);
  const data: unknown = JSON.parse(file.toString());

  const game: Game = { boards: [] };

  const dataObj = toObject(data, "data");

  if (!("boards" in dataObj)) {
    throw new Error('JSON must have top-level key "boards"');
  }

  const boards = toArray(
    toObject(dataObj.boards, "data.boards"),
    "data.boards"
  );

  for (let r = 0; r < boards.length; r++) {
    const board = toBoard(boards[r], `data.boards[${r}]`);
    game.boards.push(board);
  }

  // TODO: set daily doubles

  return game;
}
