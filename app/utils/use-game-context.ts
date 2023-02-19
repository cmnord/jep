import * as React from "react";
import { useGame } from "./use-game";

export const GameContext = React.createContext<ReturnType<typeof useGame>>({
  round: 0,
  isAnswered: () => false,
  answerClue: () => false,
  board: { categories: [], categoryNames: [] },
  clue: undefined,
  onClickClue: () => null,
  category: undefined,
});

export function useGameContext() {
  return React.useContext(GameContext);
}
