import * as React from "react";
import { GameState, useGame } from "./use-game";

export const GameContext = React.createContext<ReturnType<typeof useGame>>({
  type: GameState.Preview,
  board: { categories: [], categoryNames: [] },
  category: undefined,
  clue: undefined,
  isAnswered: () => false,
  onClickClue: () => null,
  onClosePrompt: () => null,
  players: new Map(),
  round: 0,
});

export function useGameContext() {
  return React.useContext(GameContext);
}
