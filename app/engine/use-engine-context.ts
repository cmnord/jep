import * as React from "react";

import { GameState } from "./state";
import type { useGameEngine } from "./use-game-engine";

export const GameEngineContext = React.createContext<
  ReturnType<typeof useGameEngine>
>({
  type: GameState.PreviewRound,
  activeClue: null,
  answers: new Map(),
  answeredBy: () => false,
  board: { categories: [], categoryNames: [] },
  boardControl: null,
  buzzes: new Map(),
  category: undefined,
  clue: undefined,
  getClueValue: () => 0,
  soloDispatch: () => null,
  isAnswered: () => false,
  players: new Map(),
  round: 0,
  wagers: new Map(),
  winningBuzzer: undefined,
});

export function useEngineContext() {
  return React.useContext(GameEngineContext);
}
