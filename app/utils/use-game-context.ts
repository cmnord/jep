import * as React from "react";

import { GameState } from "./use-game";
import type { useGame } from "./use-game";

export const GameContext = React.createContext<ReturnType<typeof useGame>>({
  type: GameState.Preview,
  activeClue: undefined,
  board: { categories: [], categoryNames: [] },
  boardControl: undefined,
  buzzes: new Map(),
  category: undefined,
  clue: undefined,
  isAnswered: () => false,
  numAnswered: 0,
  numCluesInBoard: 0,
  players: new Map(),
  round: 0,
  winningBuzzer: undefined,
});

export function useGameContext() {
  return React.useContext(GameContext);
}
