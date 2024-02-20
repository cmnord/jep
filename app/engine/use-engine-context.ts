import * as React from "react";

import { GameState } from "./state";
import { ConnectionState, type useGameEngine } from "./use-game-engine";

export const GameEngineContext = React.createContext<
  ReturnType<typeof useGameEngine>
>({
  type: GameState.PreviewRound,
  activeClue: null,
  answers: new Map(),
  numAnswered: 0,
  answeredBy: () => false,
  board: { categories: [], categoryNames: [] },
  boardControl: null,
  buzzes: new Map(),
  category: undefined,
  clue: undefined,
  connectionState: ConnectionState.DISCONNECTED,
  getClueValue: () => 0,
  soloDispatch: () => null,
  isAnswered: () => false,
  lastMessageAt: undefined,
  players: new Map(),
  round: 0,
  wagers: new Map(),
  winningBuzzer: undefined,
});

export function useEngineContext() {
  return React.useContext(GameEngineContext);
}
