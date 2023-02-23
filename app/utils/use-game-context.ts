import * as React from "react";

import { GameState } from "./use-game";
import type { useGame } from "./use-game";

export const GameContext = React.createContext<ReturnType<typeof useGame>>({
  type: GameState.Preview,
  board: { categories: [], categoryNames: [] },
  boardControl: undefined,
  category: undefined,
  clue: undefined,
  isAnswered: () => false,
  onClosePrompt: () => null,
  players: new Map(),
  round: 0,
});

export function useGameContext() {
  return React.useContext(GameContext);
}
