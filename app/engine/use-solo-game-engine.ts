import * as React from "react";

import type { Game } from "~/models/convert.server";

import type { Action } from "./engine";
import { gameEngine } from "./engine";
import { stateFromGame } from "./state";
import { ConnectionState, stateToGameEngine } from "./use-game-engine";

export interface SoloPersistenceConfig {
  gameId: string;
  userId: string;
  name: string;
}

/** useSoloGameEngine sets up solo play without any server room events.
 * When a persistenceConfig is provided, state is debounce-saved to IndexedDB
 * after every dispatch so the game survives page refreshes.
 */
export function useSoloGameEngine(
  game: Game,
  persistenceConfig?: SoloPersistenceConfig,
) {
  const [state, rawDispatch] = React.useReducer(gameEngine, game, (arg) =>
    stateFromGame(arg),
  );
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    () => {
      if (typeof navigator === "undefined") {
        return ConnectionState.CONNECTED;
      }
      return navigator.onLine
        ? ConnectionState.CONNECTED
        : ConnectionState.DISCONNECTED;
    },
  );

  const stateRef = React.useRef(state);
  stateRef.current = state;

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const dispatch = React.useMemo(() => {
    if (!persistenceConfig) return rawDispatch;

    const { gameId, userId, name } = persistenceConfig;
    return (action: Action) => {
      rawDispatch(action);
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const { saveSoloState, serializeState } =
          await import("~/utils/offline-storage");
        saveSoloState({
          gameId,
          state: serializeState(stateRef.current),
          userId,
          name,
          savedAt: Date.now(),
        }).catch((err: unknown) =>
          console.warn("Failed to save solo state:", err),
        );
      }, 300);
    };
  }, [persistenceConfig, rawDispatch]);

  React.useEffect(() => {
    return () => clearTimeout(saveTimerRef.current);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function handleOnline() {
      setConnectionState(ConnectionState.CONNECTED);
    }

    function handleOffline() {
      setConnectionState(ConnectionState.DISCONNECTED);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return stateToGameEngine(game, state, dispatch, {
    connectionState,
    lastMessageAt: undefined,
    reconnect: undefined,
  });
}
