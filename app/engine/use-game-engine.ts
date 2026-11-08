import * as React from "react";

import type { AuthSession } from "~/models/auth";
import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";

import type { Action } from "./engine";
import { gameEngine, getWinningBuzzer } from "./engine";
import {
  applyRoomEventsToState,
  compareRoomEvents,
  isTypedRoomEvent,
  mergeRoomEvents,
  roomEventToAction,
} from "./room-event";
import {
  type State,
  getCheckCorrectionForPlayer,
  getClueValue,
  stateFromGame,
} from "./state";

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

/** Delay for the second catch-up fetch after SUBSCRIBED. Supabase can drop
 * postgres_changes INSERTs that happen right after the channel subscribes
 * (the CDC pipeline is still warming up), so fetch once more after it. */
const CATCH_UP_DELAY_MS = 3_000;

/** Internal reducer action that swaps in a state rebuilt from all known room
 * events (used when an event arrives out of order). */
const REPLACE_STATE = "__replace_state";
type EngineAction = Action | { type: typeof REPLACE_STATE; state: State };

function syncedGameEngine(state: State, action: EngineAction): State {
  if (action.type === REPLACE_STATE) {
    return action.state;
  }
  return gameEngine(state, action);
}

function maxEventId(events: readonly DbRoomEvent[], initial = 0) {
  return events.reduce((max, e) => Math.max(max, e.id), initial);
}

export function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
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
    checkCorrection: state.checkCorrection,
    connectionState,
    getCheckCorrection: (userId: string) =>
      getCheckCorrectionForPlayer(state, userId),
    getClueValue: getClueValueFn,
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
) {
  const knownEvents = React.useRef<DbRoomEvent[] | null>(null);
  if (knownEvents.current === null) {
    knownEvents.current = [...serverRoomEvents].sort(compareRoomEvents);
  }
  const fetchedUpToId = React.useRef(maxEventId(serverRoomEvents));

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
    syncedGameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(stateFromGame(arg.game), arg.serverRoomEvents),
  );

  const gameRef = React.useRef(game);
  React.useEffect(() => {
    gameRef.current = game;
  }, [game]);

  /** Merge room events from any source (realtime, catch-up fetch, loader
   * snapshot) into state. `complete` marks a source that returns every event
   * after `fetchedUpToId`, so the watermark may advance. */
  const ingestEvents = React.useCallback(
    (incoming: readonly DbRoomEvent[], { complete }: { complete: boolean }) => {
      if (complete) {
        fetchedUpToId.current = maxEventId(incoming, fetchedUpToId.current);
      }
      const { events, added, appendOnly } = mergeRoomEvents(
        knownEvents.current ?? [],
        incoming,
      );
      if (added.length === 0) return false;
      knownEvents.current = events;
      if (appendOnly) {
        for (const re of added) {
          dispatch(roomEventToAction(re));
        }
      } else {
        dispatch({
          type: REPLACE_STATE,
          state: applyRoomEventsToState(stateFromGame(gameRef.current), events),
        });
      }
      return true;
    },
    [],
  );

  React.useEffect(() => {
    ingestEvents(serverRoomEvents, { complete: true });
  }, [serverRoomEvents, ingestEvents]);

  const client = React.useMemo(() => getSupabase(accessToken), [accessToken]);

  React.useEffect(() => {
    let disposed = false;
    const channel = client.channel(`realtime:roomId:${roomId}`);

    /** Fetch events from the DB that we haven't seen yet. */
    async function fetchMissedEvents() {
      try {
        const { data, error } = await client
          .from("room_events")
          .select("*")
          .eq("room_id", roomId)
          .gt("id", fetchedUpToId.current)
          .order("ts", { ascending: true });

        if (error || !data || disposed) return;

        if (ingestEvents(data, { complete: true })) {
          setLastMessageAt(Date.now());
        }
      } catch (err) {
        console.error("Failed to fetch missed events:", err);
      }
    }

    let catchUpTimer: ReturnType<typeof setTimeout> | undefined;

    // Timer to escalate RECONNECTING → DISCONNECTED after prolonged failure.
    let reconnectingTimer: ReturnType<typeof setTimeout> | undefined;
    let gaveUp = false;
    function startReconnectingTimer() {
      if (reconnectingTimer !== undefined) return;
      reconnectingTimer = setTimeout(() => {
        gaveUp = true;
        if (!disposed) setConnectionState(ConnectionState.DISCONNECTED);
      }, RECONNECTING_TIMEOUT_MS);
    }
    function clearReconnectingTimer() {
      clearTimeout(reconnectingTimer);
      reconnectingTimer = undefined;
      gaveUp = false;
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
          ingestEvents([newEvent], { complete: false });
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
            clearTimeout(catchUpTimer);
            catchUpTimer = setTimeout(fetchMissedEvents, CATCH_UP_DELAY_MS);
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
            if (!gaveUp) setConnectionState(nextState);
            // Escalate to DISCONNECTED if retries don't succeed in time —
            // including on the first connection attempt, which previously
            // showed "Connecting..." forever with no manual retry offered
            // (e.g. when the page loads while the realtime backend is
            // restarting).
            startReconnectingTimer();
            if (err) {
              console.warn("Realtime subscription issue:", status, err.message);
            }
            // Supabase handles retry internally via rejoinTimer.
            return;
          }
        }
      });

    /** Whether the channel (and its socket) still look alive. */
    function isChannelHealthy() {
      return (
        (channel.state === "joined" || channel.state === "joining") &&
        client.realtime.isConnected()
      );
    }

    // Re-sync when the tab returns to the foreground or the device comes back
    // online.
    function resync() {
      if (document.visibilityState !== "visible" || disposed) return;
      fetchMissedEvents();
      // If the channel silently disconnected, trigger a full reconnect.
      if (!isChannelHealthy()) {
        setReconnectTrigger((t) => t + 1);
      }
    }
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted || disposed) return;
      fetchMissedEvents();
      setReconnectTrigger((t) => t + 1);
    }
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);
    window.addEventListener("pageshow", handlePageShow);

    // Periodic check for silent disconnects.
    const stalenessInterval = setInterval(() => {
      if (disposed) return;
      if (!isChannelHealthy() && reconnectingTimer === undefined) {
        console.info(
          "Staleness check: channel not joined, triggering reconnect",
        );
        setReconnectTrigger((t) => t + 1);
      }
    }, STALENESS_CHECK_MS);

    return () => {
      disposed = true;
      clearReconnectingTimer();
      clearTimeout(catchUpTimer);
      clearInterval(stalenessInterval);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
      window.removeEventListener("pageshow", handlePageShow);
      client.removeChannel(channel);
    };
  }, [client, roomId, reconnectTrigger, ingestEvents]);

  return stateToGameEngine(game, state, dispatch, {
    connectionState,
    lastMessageAt,
    reconnect,
  });
}
