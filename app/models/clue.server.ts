export interface Clue {
  category: string;
  clue: string;
  /** answer is not in the form of a question. */
  answer: string;
  value: number;
  isDailyDouble: boolean;
  isFinal: boolean;
}
