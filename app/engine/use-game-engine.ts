import * as React from "react";

import type { AuthSession } from "~/models/auth";
import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";

import type { Action } from "./engine";
import { gameEngine, getWinningBuzzer } from "./engine";
import {
  applyRoomEventsToState,
  isTypedRoomEvent,
  roomEventToAction,
} from "./room-event";
import { type State, getClueValue, stateFromGame } from "./state";

export enum ConnectionState {
  /** Initial connection attempt (first load). */
  CONNECTING,
  /** Subscribed and receiving events. */
  CONNECTED,
  /** Lost connection, actively retrying. */
  RECONNECTING,
  /** Gave up after max retries or intentionally closed. Needs user action. */
  DISCONNECTED,
}

/** How often to check if the channel silently disconnected. */
const STALENESS_CHECK_MS = 30_000;

/** How long to remain in RECONNECTING before escalating to DISCONNECTED. */
const RECONNECTING_TIMEOUT_MS = 60_000;
const STALE_OPTIMISTIC_MUTATION_MS = 10_000;

type OptimisticAction = Omit<Action, "ts">;

function getClientMutationId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const mutationId = Reflect.get(payload, "clientMutationId");
  return typeof mutationId === "string" ? mutationId : undefined;
}

export function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
  optimisticDispatch: (action: OptimisticAction) => string,
  {
    connectionState,
    lastMessageAt,
    reconnect,
  }: {
    connectionState: ConnectionState;
    lastMessageAt?: number;
    reconnect?: () => void;
  },
) {
  // Board may be undefined
  const board = game.boards.at(state.round);

  let clue: Clue | undefined;
  let category: string | undefined;
  if (state.activeClue && board) {
    const [i, j] = state.activeClue;
    clue = state.activeClue ? board.categories[j].clues[i] : undefined;
    category = state.activeClue ? board.categoryNames[j] : undefined;
  }

  const isAnswered = (i: number, j: number) => {
    return state.isAnswered.at(state.round)?.at(i)?.at(j)?.isAnswered ?? false;
  };

  const answeredBy = (i: number, j: number, userId: string) => {
    return state.isAnswered
      .at(state.round)
      ?.at(i)
      ?.at(j)
      ?.answeredBy.get(userId);
  };

  const winningBuzz = getWinningBuzzer(state.buzzes, clue?.clue);
  const winningBuzzer = winningBuzz?.userId ?? undefined;

  function getClueValueFn(idx: [number, number], userId: string) {
    return getClueValue(state, idx, userId);
  }

  const clueKey = `${state.round},${
    state.activeClue ? state.activeClue[0] : -1
  },${state.activeClue ? state.activeClue[1] : -1}`;

  return {
    type: state.type,
    activeClue: state.activeClue,
    /** answeredBy checks whether the user answered the given clue and whether
     * they were correct.
     */
    answeredBy,
    answers: state.answers.get(clueKey) ?? new Map<string, string>(),
    numAnswered: state.numAnswered,
    board,
    buzzes: state.buzzes,
    category,
    clue,
    connectionState,
    getClueValue: getClueValueFn,
    optimisticDispatch,
    soloDispatch: dispatch,
    isAnswered,
    lastMessageAt,
    players: state.players,
    reconnect,
    round: state.round,
    boardControl: state.boardControl,
    wagers: state.wagers.get(clueKey) ?? new Map<string, number>(),
    winningBuzzer,
    clockRunning: state.clockRunning,
    clockAccumulatedMs: state.clockAccumulatedMs,
    clockLastResumedAt: state.clockLastResumedAt,
  };
}

/** useGameEngine provides all the state variables associated with a game.  The
 * game state is stored on the server as a series of "room events", or deltas,
 * which are applied in order to derive the state.
 *
 * The game engine then subscribes to row inserts to the room_events table via
 * websockets.
 *
 * To modify the state, submit a POST request to the proper endpoint to insert a
 * room event. The event will then be propagated to all clients via websockets
 * and the engine will apply it to the state.
 */
export function useGameEngine(
  game: Game,
  serverRoomEvents: DbRoomEvent[],
  roomId: number,
  accessToken?: AuthSession["accessToken"],
  optimisticEnabled = false,
) {
  const seenEventIds = React.useRef(new Set(serverRoomEvents.map((e) => e.id)));

  const hasConnectedOnce = React.useRef(false);
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.CONNECTING,
  );
  const [lastMessageAt, setLastMessageAt] = React.useState<
    number | undefined
  >();
  // Incrementing this triggers the useEffect to tear down and reconnect.
  const [reconnectTrigger, setReconnectTrigger] = React.useState(0);
  const reconnect = React.useCallback(() => {
    setReconnectTrigger((t) => t + 1);
  }, []);

  const [state, dispatch] = React.useReducer(
    gameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(stateFromGame(arg.game), arg.serverRoomEvents),
  );

  const client = React.useMemo(() => getSupabase(accessToken), [accessToken]);

  const pendingMutationIds = React.useRef(new Map<string, number>());

  const optimisticDispatch = React.useCallback(
    (action: OptimisticAction) => {
      if (!optimisticEnabled) {
        return "";
      }

      const clientMutationId = crypto.randomUUID();
      const payload = action.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        console.warn(
          "optimisticDispatch expected payload object; skipping optimistic dispatch",
        );
        return "";
      }

      const now = Date.now();
      pendingMutationIds.current.set(clientMutationId, now);

      dispatch({
        ...action,
        payload: {
          ...payload,
          clientMutationId,
        },
        ts: now,
      });
      return clientMutationId;
    },
    [optimisticEnabled],
  );

  const pruneStaleOptimisticMutations = React.useCallback(() => {
    const now = Date.now();
    for (const [mutationId, submittedAt] of pendingMutationIds.current) {
      if (now - submittedAt > STALE_OPTIMISTIC_MUTATION_MS) {
        pendingMutationIds.current.delete(mutationId);
        console.warn("Action not confirmed — state resynced.");
      }
    }
  }, []);

  const applyServerAction = React.useCallback(
    (action: Action) => {
      const mutationId = getClientMutationId(action.payload);
      if (
        mutationId &&
        optimisticEnabled &&
        pendingMutationIds.current.delete(mutationId)
      ) {
        return;
      }
      dispatch(action);
    },
    [optimisticEnabled],
  );

  React.useEffect(() => {
    if (!optimisticEnabled) {
      pendingMutationIds.current.clear();
      return;
    }

    const timer = setInterval(pruneStaleOptimisticMutations, 2_000);
    return () => clearInterval(timer);
  }, [optimisticEnabled, pruneStaleOptimisticMutations]);

  React.useEffect(() => {
    let disposed = false;
    const channel = client.channel(`realtime:roomId:${roomId}`);

    /** Fetch events from the DB that we haven't seen yet. */
    async function fetchMissedEvents() {
      const maxSeenId =
        seenEventIds.current.size > 0 ? Math.max(...seenEventIds.current) : 0;

      try {
        const { data, error } = await client
          .from("room_events")
          .select("*")
          .eq("room_id", roomId)
          .gt("id", maxSeenId)
          .order("ts", { ascending: true });

        if (error || !data || disposed) return;

        for (const event of data) {
          if (!seenEventIds.current.has(event.id) && isTypedRoomEvent(event)) {
            seenEventIds.current.add(event.id);
            applyServerAction(roomEventToAction(event));
          }
        }
        pruneStaleOptimisticMutations();
        if (data.length > 0) {
          setLastMessageAt(Date.now());
        }
      } catch (err) {
        console.error("Failed to fetch missed events:", err);
      }
    }

    // Timer to escalate RECONNECTING → DISCONNECTED after prolonged failure.
    let reconnectingTimer: ReturnType<typeof setTimeout> | undefined;
    function startReconnectingTimer() {
      clearTimeout(reconnectingTimer);
      reconnectingTimer = setTimeout(() => {
        if (!disposed) setConnectionState(ConnectionState.DISCONNECTED);
      }, RECONNECTING_TIMEOUT_MS);
    }
    function clearReconnectingTimer() {
      clearTimeout(reconnectingTimer);
      reconnectingTimer = undefined;
    }

    setConnectionState(
      hasConnectedOnce.current
        ? ConnectionState.RECONNECTING
        : ConnectionState.CONNECTING,
    );

    channel
      .on<DbRoomEvent>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_events",
          filter: "room_id=eq." + roomId,
        },
        (payload) => {
          if (disposed) return;
          const newEvent = payload.new;
          setLastMessageAt(Date.now());
          if (!isTypedRoomEvent(newEvent)) {
            console.error(
              "unhandled room event type from DB: " + newEvent.type,
            );
            return;
          }
          if (!seenEventIds.current.has(newEvent.id)) {
            seenEventIds.current.add(newEvent.id);
            applyServerAction(roomEventToAction(newEvent));
          }
        },
      )
      .subscribe((status, err) => {
        if (disposed) return;

        switch (status) {
          case "SUBSCRIBED":
            hasConnectedOnce.current = true;
            clearReconnectingTimer();
            setConnectionState(ConnectionState.CONNECTED);
            fetchMissedEvents();
            return;

          case "CLOSED":
            clearReconnectingTimer();
            setConnectionState(ConnectionState.DISCONNECTED);
            return;

          case "CHANNEL_ERROR":
          case "TIMED_OUT": {
            const nextState = hasConnectedOnce.current
              ? ConnectionState.RECONNECTING
              : ConnectionState.CONNECTING;
            setConnectionState(nextState);
            if (nextState === ConnectionState.RECONNECTING) {
              startReconnectingTimer();
            }
            if (err) {
              console.warn("Realtime subscription issue:", status, err.message);
            }
            // Supabase handles retry internally via rejoinTimer.
            return;
          }
        }
      });

    // Re-sync when the tab returns to the foreground.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || disposed) return;
      fetchMissedEvents();
      // If the channel silently disconnected, trigger a full reconnect.
      if (channel.state !== "joined" && channel.state !== "joining") {
        setReconnectTrigger((t) => t + 1);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check for silent disconnects.
    const stalenessInterval = setInterval(() => {
      if (disposed) return;
      if (channel.state !== "joined" && channel.state !== "joining") {
        console.info(
          "Staleness check: channel not joined, triggering reconnect",
        );
        setReconnectTrigger((t) => t + 1);
      }
    }, STALENESS_CHECK_MS);

    return () => {
      disposed = true;
      clearReconnectingTimer();
      clearInterval(stalenessInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      client.removeChannel(channel);
    };
  }, [
    applyServerAction,
    client,
    pruneStaleOptimisticMutations,
    roomId,
    reconnectTrigger,
  ]);

  return stateToGameEngine(game, state, dispatch, optimisticDispatch, {
    connectionState,
    lastMessageAt,
    reconnect,
  });
}
