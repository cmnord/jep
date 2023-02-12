import { Clue } from "~/models/clue.server";

export interface Board {
  categories: string[];
  clues: Clue[][];
}
