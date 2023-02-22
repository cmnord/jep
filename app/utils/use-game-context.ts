import * as React from "react";
import { GameState, useGame } from "./use-game";

export const GameContext = React.createContext<ReturnType<typeof useGame>>({
  type: GameState.Preview,
  board: { categories: [], categoryNames: [] },
  category: undefined,
  clue: undefined,
  isAnswered: () => false,
  onClickClue: () => null,
  onClosePreview: () => null,
  onClosePrompt: () => null,
  players: new Set(),
  round: 0,
});

export function useGameContext() {
  return React.useContext(GameContext);
}
