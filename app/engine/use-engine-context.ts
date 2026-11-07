import * as React from "react";

import { NO_BROADCAST } from "./room-broadcast";
import { NO_SCORE_CHANGES } from "./standings";
import { GameState } from "./state";
import { ConnectionState, type useGameEngine } from "./use-game-engine";

export const GameEngineContext = React.createContext<
  ReturnType<typeof useGameEngine>
>({
  type: GameState.PreviewRound,
  activeClue: null,
  answers: new Map(),
  choicePicks: new Map(),
  numAnswered: 0,
  answeredBy: () => false,
  board: { categories: [], categoryNames: [] },
  boardControl: null,
  buzzes: new Map(),
  category: undefined,
  checkCorrection: null,
  clue: undefined,
  connectionState: ConnectionState.DISCONNECTED,
  getCheckCorrection: () => undefined,
  getClueValue: () => 0,
  soloDispatch: () => null,
  isAnswered: () => false,
  lastMessageAt: undefined,
  players: new Map(),
  leftPlayers: new Map(),
  teamNames: new Map(),
  reconnect: () => {},
  round: 0,
  wagers: new Map(),
  winningBuzzer: undefined,
  clockRunning: false,
  clockAccumulatedMs: 0,
  clockLastResumedAt: null,
  isPaused: false,
  answerTimeSec: 0,
  autoWrongOnTimeout: true,
  answerStartedAt: null,
  answerTimedOut: null,
  readTimeSec: null,
  buzzWindowSec: 5,
  finalAnswerTimeSec: 30,
  wagerTimeSec: 0,
  wagerStartedAt: null,
  longFormStartedAt: null,
  watchers: 0,
  watcherList: [],
  soundboard: NO_BROADCAST,
  scoreChanges: NO_SCORE_CHANGES,
  scoreChangesKey: "",
  scoreAdjustments: [],
  numSkipped: 0,
  numSkippedByHost: 0,
  activeClueSkipped: false,
  activeClueSkippedByHost: false,
  adminStep: { kind: "none" },
  host: null,
  mediaReplayCount: 0,
  canSkipOpenClue: false,
});

export function useEngineContext() {
  return React.useContext(GameEngineContext);
}
