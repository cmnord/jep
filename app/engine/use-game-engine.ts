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
import { State, getClueValue, stateFromGame } from "./state";

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

/** Exponential backoff constants for reconnection. */
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const JITTER_MS = 1000;
export const MAX_RETRIES = 10;

/** How often to check if the channel silently disconnected. */
const STALENESS_CHECK_MS = 30_000;

function getBackoffDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return delay + Math.random() * JITTER_MS;
}

function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
  {
    connectionState,
    lastMessageAt,
    reconnect,
    numRetries,
  }: {
    connectionState: ConnectionState;
    lastMessageAt?: number;
    reconnect: () => void;
    numRetries: number;
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
    soloDispatch: dispatch,
    isAnswered,
    lastMessageAt,
    numRetries,
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

/** useSoloGameEngine sets up solo play without any server room events. This
 * means that once the page refreshes the game loses all progress.
 */
export function useSoloGameEngine(game: Game) {
  const [state, dispatch] = React.useReducer(gameEngine, game, (arg) =>
    stateFromGame(arg),
  );

  return stateToGameEngine(game, state, dispatch, {
    connectionState: ConnectionState.CONNECTED,
    lastMessageAt: undefined,
    reconnect: () => {},
    numRetries: 0,
  });
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
  const seenEventIds = React.useRef(new Set(serverRoomEvents.map((e) => e.id)));

  const hasConnectedOnce = React.useRef(false);
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.CONNECTING,
  );
  const [lastMessageAt, setLastMessageAt] = React.useState<
    number | undefined
  >();
  const [numRetries, setNumRetries] = React.useState(0);

  // Incrementing this triggers the useEffect to tear down and reconnect.
  const [reconnectTrigger, setReconnectTrigger] = React.useState(0);
  const reconnect = React.useCallback(() => {
    setNumRetries(0);
    setReconnectTrigger((t) => t + 1);
  }, []);

  const [state, dispatch] = React.useReducer(
    gameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(stateFromGame(arg.game), arg.serverRoomEvents),
  );

  const client = React.useMemo(() => getSupabase(accessToken), [accessToken]);

  React.useEffect(() => {
    let channel = client.channel(`realtime:roomId:${roomId}`);
    let retryCount = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    /** Unsubscribe without removing—safe to call during retries. */
    function unsubscribeChannel() {
      try {
        channel.unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    }

    /** Full teardown: unsubscribe AND remove from client. Only for final cleanup. */
    function removeChannel() {
      try {
        channel.unsubscribe();
        client.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    }

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
            dispatch(roomEventToAction(event));
          }
        }
        if (data.length > 0) {
          setLastMessageAt(Date.now());
        }
      } catch (err) {
        console.error("Failed to fetch missed events:", err);
      }
    }

    function scheduleRetry() {
      retryCount++;
      const delay = getBackoffDelay(retryCount);
      console.info(
        `Scheduling reconnect attempt ${retryCount}/${MAX_RETRIES} in ${Math.round(delay)}ms`,
      );
      setNumRetries(retryCount);
      retryTimeout = setTimeout(subscribeToChannel, delay);
    }

    function subscribeToChannel() {
      if (disposed) return;
      if (retryCount >= MAX_RETRIES) {
        setConnectionState(ConnectionState.DISCONNECTED);
        return;
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
            const newEvent = payload.new;
            setLastMessageAt(Date.now());
            if (!isTypedRoomEvent(newEvent)) {
              throw new Error(
                "unhandled room event type from DB: " + newEvent.type,
              );
            }
            if (!seenEventIds.current.has(newEvent.id)) {
              seenEventIds.current.add(newEvent.id);
              dispatch(roomEventToAction(newEvent));
            }
          },
        )
        .subscribe((status, err) => {
          if (disposed) return;
          if (err) {
            console.error("Realtime subscription error:", err.message);
            setConnectionState(ConnectionState.RECONNECTING);
            unsubscribeChannel();
            channel = client.channel(`realtime:roomId:${roomId}`);
            scheduleRetry();
          } else {
            switch (status) {
              case "SUBSCRIBED":
                hasConnectedOnce.current = true;
                retryCount = 0;
                setNumRetries(0);
                setConnectionState(ConnectionState.CONNECTED);
                // Backfill any events missed during reconnection
                fetchMissedEvents();
                return;
              case "CLOSED":
                return setConnectionState(ConnectionState.DISCONNECTED);
              case "CHANNEL_ERROR":
              case "TIMED_OUT":
                setConnectionState(ConnectionState.RECONNECTING);
                unsubscribeChannel();
                channel = client.channel(`realtime:roomId:${roomId}`);
                scheduleRetry();
                return;
            }
          }
        });
    }

    subscribeToChannel();

    // Re-sync when the tab returns to the foreground.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || disposed) return;
      // Always fetch missed events — cheap and catches any gaps
      fetchMissedEvents();
      // If the channel silently disconnected, reconnect
      if (channel.state !== "joined") {
        retryCount = 0;
        setNumRetries(0);
        unsubscribeChannel();
        channel = client.channel(`realtime:roomId:${roomId}`);
        subscribeToChannel();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check for silent disconnects.
    const stalenessInterval = setInterval(() => {
      if (disposed) return;
      if (channel.state !== "joined" && retryCount === 0) {
        console.info("Staleness check: channel not joined, reconnecting");
        unsubscribeChannel();
        channel = client.channel(`realtime:roomId:${roomId}`);
        subscribeToChannel();
      }
    }, STALENESS_CHECK_MS);

    return () => {
      disposed = true;
      clearTimeout(retryTimeout);
      clearInterval(stalenessInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel.state === "joined") {
        console.info("unsubscribing from channel", channel.state);
      }
      removeChannel();
    };
  }, [client, roomId, reconnectTrigger]);

  return stateToGameEngine(game, state, dispatch, {
    connectionState,
    lastMessageAt,
    reconnect,
    numRetries,
  });
}
