import { Clue } from "~/models/clue.server";

interface Category {
  name: string;
  clues: Clue[];
}

export interface Board {
  categoryNames: string[];
  categories: Category[];
}
