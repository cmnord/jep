import { Clue } from "~/models/clue.server";

export type Board = {
  categories: string[];
  clues: {
    [key: string]: Clue[];
  };
};
