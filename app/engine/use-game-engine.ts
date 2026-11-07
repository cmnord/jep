import type { RealtimeChannel } from "@supabase/supabase-js";
import * as React from "react";

import type { AuthSession } from "~/models/auth";
import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";
import { noteServerTime } from "~/utils/server-clock";
import { SOUNDBOARD_EVENT } from "~/utils/soundboard/messages";

import { canSkipOpenClue, getAdminStep } from "./admin";
import type { Action } from "./engine";
import {
  gameEngine,
  getStateTiebreakerSeed,
  getWinningBuzzer,
  parseUtcMs,
} from "./engine";
import {
  countWatchers,
  listWatchers,
  type PresenceIdentity,
  type PresenceRole,
} from "./presence";
import { withRevealedAnswers } from "./revealed";
import {
  createListenerSet,
  NO_BROADCAST,
  type RoomBroadcast,
} from "./room-broadcast";
import {
  applyRoomEventsToState,
  compareRoomEvents,
  isTypedRoomEvent,
  mergeRoomEvents,
  roomEventToAction,
} from "./room-event";
import { getBuzzWindowMs } from "./room-timers";
import { getScoreChanges, scoreChangesKey } from "./standings";
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

const NO_WATCHERS: PresenceIdentity[] = [];

export function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
  {
    connectionState,
    lastMessageAt,
    reconnect,
    watchers = 0,
    watcherList = NO_WATCHERS,
    soundboard = NO_BROADCAST,
  }: {
    connectionState: ConnectionState;
    lastMessageAt?: number;
    reconnect?: () => void;
    watchers?: number;
    watcherList?: PresenceIdentity[];
    soundboard?: RoomBroadcast;
  },
) {
  // Board may be undefined. In host mode answers withheld from this visitor
  // are filled in once the server reveals them.
  const board = withRevealedAnswers(
    game.boards.at(state.round),
    state.round,
    state.revealed,
  );

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

  const winningBuzz = getWinningBuzzer(
    state.buzzes,
    getStateTiebreakerSeed(state),
    getBuzzWindowMs(state),
  );
  const winningBuzzer = winningBuzz?.userId ?? undefined;

  function getClueValueFn(idx: [number, number], userId: string) {
    return getClueValue(state, idx, userId);
  }

  const scoreChanges = getScoreChanges(state);

  let numSkipped = 0;
  let numSkippedByHost = 0;
  for (const rows of state.isAnswered) {
    for (const row of rows) {
      for (const cell of row) {
        if (cell.skipped) numSkipped += 1;
        if (cell.skippedByHost) numSkippedByHost += 1;
      }
    }
  }
  const activeCell = state.activeClue
    ? state.isAnswered
        .at(state.round)
        ?.at(state.activeClue[0])
        ?.at(state.activeClue[1])
    : undefined;

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
    /** Options picked on the active multiple choice clue (userId -> index). */
    choicePicks: state.choicePicks.get(clueKey) ?? new Map<string, number>(),
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
    /** Players who left mid-game (they still count for their team). */
    leftPlayers: state.leftPlayers,
    /** Custom team names (team mode). */
    teamNames: state.teamNames,
    reconnect,
    round: state.round,
    boardControl: state.boardControl,
    wagers: state.wagers.get(clueKey) ?? new Map<string, number>(),
    winningBuzzer,
    clockRunning: state.clockRunning,
    clockAccumulatedMs: state.clockAccumulatedMs,
    clockLastResumedAt: state.clockLastResumedAt,
    isPaused: state.isPaused,
    /** Answer timer (room setting): seconds per answer turn, 0 = off. */
    answerTimeSec: state.answerTimeSec,
    autoWrongOnTimeout: state.autoWrongOnTimeout,
    /** When the current answer turn started (server clock), or null. */
    answerStartedAt: state.answerStartedAt,
    /** Whose answer turn on the active clue ran out of time, if any. */
    answerTimedOut: state.answerTimedOut,
    /** Room timers (room settings, see engine/room-timers.ts). */
    readTimeSec: state.readTimeSec,
    buzzWindowSec: state.buzzWindowSec,
    finalAnswerTimeSec: state.finalAnswerTimeSec,
    wagerTimeSec: state.wagerTimeSec,
    /** When the current wager step started (server clock), or null. */
    wagerStartedAt: state.wagerStartedAt,
    /** When the current Final answer step started (server clock), or null. */
    longFormStartedAt: state.longFormStartedAt,
    /** How many people are watching the room without playing (spectators,
     * counted with Realtime presence; 0 in solo play). */
    watchers,
    /** The spectators who announced who they are (the admin may make one
     * of them the host). */
    watcherList,
    /** Soundboard sounds on the room channel (Realtime broadcast, never
     * stored); unavailable in solo play. */
    soundboard,
    /** Each player's score change on the previous question (see
     * engine/standings.ts). */
    scoreChanges,
    /** Changes when a new question changes scores ("" before any). */
    scoreChangesKey: scoreChangesKey(state, scoreChanges),
    /** Score changes made by the site admin, oldest first. */
    scoreAdjustments: state.scoreAdjustments,
    /** How many questions the site admin skipped so far (all rounds). */
    numSkipped,
    /** How many of them the room's host skipped (feature 22). */
    numSkippedByHost,
    /** The site admin (or the host) skipped the active question. */
    activeClueSkipped: activeCell?.skipped ?? false,
    /** The host (not the admin) skipped the active question. */
    activeClueSkippedByHost: activeCell?.skippedByHost ?? false,
    /** The host seat (feature 22): null plays the self-marking game. */
    host: state.host,
    /** How many times the host replayed the open question's audio/video
     * (feature 23); media restarts on every device when it goes up. */
    mediaReplayCount: getMediaReplayCount(state),
    /** What the game waits for from a player (the admin panel). */
    adminStep: getAdminStep(state),
    /** The open question may be skipped by the admin. */
    canSkipOpenClue: canSkipOpenClue(state),
  };
}

/** getMediaReplayCount is the replay count of the open question (0 when
 * none, or when the count belongs to another question). */
function getMediaReplayCount(state: State) {
  const replay = state.mediaReplay;
  const clue = state.activeClue;
  if (!replay || !clue) return 0;
  return replay.round === state.round &&
    replay.i === clue[0] &&
    replay.j === clue[1]
    ? replay.count
    : 0;
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
 *
 * `presence` announces this client on the room channel (Realtime presence)
 * so others can see how many people are watching; null announces nothing.
 */
export function useGameEngine(
  game: Game,
  serverRoomEvents: DbRoomEvent[],
  roomId: number,
  accessToken?: AuthSession["accessToken"],
  presence: PresenceRole | null = null,
  {
    answersHidden = false,
    presenceIdentity,
  }: {
    /** The loader withheld the answers of unresolved questions (host mode,
     * feature 22). When this changes the state is rebuilt with the new game
     * data. */
    answersHidden?: boolean;
    /** Announced with a spectator's presence so the admin can make them the
     * host (feature 22). */
    presenceIdentity?: PresenceIdentity;
  } = {},
) {
  // Every room event applied to `state`, sorted by (ts, id). Used to dedupe
  // events by id and to rebuild state if an event arrives out of order.
  const knownEvents = React.useRef<DbRoomEvent[] | null>(null);
  if (knownEvents.current === null) {
    knownEvents.current = [...serverRoomEvents].sort(compareRoomEvents);
  }
  // Highest event id up to which we hold a complete snapshot (from the loader
  // or a catch-up fetch). Realtime events never advance it: if realtime drops
  // event N but delivers N+1, the next catch-up must still fetch event N.
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

  // Host mode switched (a host claimed or freed the seat) and the loader
  // sent the game with (or without) the answers: replay the known events
  // with it, so the engine and the board use the new game data.
  const answersHiddenRef = React.useRef(answersHidden);
  React.useEffect(() => {
    if (answersHiddenRef.current === answersHidden) return;
    answersHiddenRef.current = answersHidden;
    dispatch({
      type: REPLACE_STATE,
      state: applyRoomEventsToState(
        stateFromGame(game),
        knownEvents.current ?? [],
      ),
    });
  }, [answersHidden, game]);

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

  // React Router revalidates the room loader after every fetcher action, so
  // the player's own actions (e.g. Join) come back in a fresh snapshot even
  // if the realtime channel is not subscribed yet or drops the INSERT.
  React.useEffect(() => {
    ingestEvents(serverRoomEvents, { complete: true });
  }, [serverRoomEvents, ingestEvents]);

  const client = React.useMemo(() => getSupabase(accessToken), [accessToken]);

  // Realtime presence: who is on the room channel, and in which role. Only a
  // count of spectators is shown (no names). The role can change without
  // re-subscribing (e.g. a spectator joins the game), so it is kept in a ref
  // and re-announced on the live channel.
  const [watchers, setWatchers] = React.useState(0);
  const [watcherList, setWatcherList] = React.useState(NO_WATCHERS);
  const presenceRef = React.useRef({ role: presence, presenceIdentity });
  /** What this client last announced on the live channel. */
  const announcedRef = React.useRef<string | null>(null);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const identityUserId = presenceIdentity?.userId;
  const identityName = presenceIdentity?.name;
  React.useEffect(() => {
    const identity =
      identityUserId !== undefined && identityName !== undefined
        ? { userId: identityUserId, name: identityName }
        : undefined;
    presenceRef.current = { role: presence, presenceIdentity: identity };
    const channel = channelRef.current;
    // Re-announce only a real change: tracking the same presence again
    // right after a reload of the page's data can close the channel.
    const key = presenceKey(presence, identity);
    if (channel?.state === "joined" && announcedRef.current !== key) {
      announcedRef.current = key;
      announcePresence(channel, presence, identity);
    }
  }, [presence, identityUserId, identityName]);

  // Soundboard: ephemeral Realtime broadcasts on the same channel. Listeners
  // survive reconnects (they are not tied to one channel instance).
  const soundboardListeners =
    React.useRef(createListenerSet<unknown>()).current;
  const soundboard = React.useMemo<RoomBroadcast>(
    () => ({
      available: true,
      send(payload) {
        const channel = channelRef.current;
        if (!channel || channel.state !== "joined") return false;
        channel
          .send({ type: "broadcast", event: SOUNDBOARD_EVENT, payload })
          .catch((err: unknown) =>
            console.warn("Soundboard broadcast failed:", err),
          );
        return true;
      },
      subscribe: soundboardListeners.add,
    }),
    [soundboardListeners],
  );

  React.useEffect(() => {
    let disposed = false;
    const channel = client.channel(`realtime:roomId:${roomId}`, {
      // A random key per connection: the same browser in two tabs (or a
      // player's phone and the TV) counts twice. Created in the effect, never
      // during render, so it can't cause a hydration mismatch.
      config: { presence: { key: crypto.randomUUID() } },
    });
    channelRef.current = channel;

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
    // Once escalated, stay DISCONNECTED (offering a manual retry) until the
    // channel actually subscribes again, instead of flickering back to
    // RECONNECTING on every background retry.
    let gaveUp = false;
    function startReconnectingTimer() {
      // Don't restart a running timer: Supabase retries emit CHANNEL_ERROR /
      // TIMED_OUT repeatedly, which would otherwise postpone the escalation
      // forever.
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
          // A live event was stamped by the server a moment ago: a sample
          // for the server clock estimate (answer timer).
          noteServerTime(parseUtcMs(newEvent.ts));
          if (!isTypedRoomEvent(newEvent)) {
            console.error(
              "unhandled room event type from DB: " + newEvent.type,
            );
            return;
          }
          ingestEvents([newEvent], { complete: false });
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (disposed) return;
        setWatchers(countWatchers(channel.presenceState()));
        setWatcherList(listWatchers(channel.presenceState()));
      })
      .on("broadcast", { event: SOUNDBOARD_EVENT }, (message) => {
        if (disposed) return;
        soundboardListeners.emit(message.payload);
      })
      .subscribe((status, err) => {
        if (disposed) return;

        switch (status) {
          case "SUBSCRIBED":
            hasConnectedOnce.current = true;
            clearReconnectingTimer();
            setConnectionState(ConnectionState.CONNECTED);
            announcedRef.current = presenceKey(
              presenceRef.current.role,
              presenceRef.current.presenceIdentity,
            );
            announcePresence(
              channel,
              presenceRef.current.role,
              presenceRef.current.presenceIdentity,
            );
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
    // online (e.g. a phone unlocking or switching networks).
    function resync() {
      if (document.visibilityState !== "visible" || disposed) return;
      fetchMissedEvents();
      // If the channel silently disconnected, trigger a full reconnect.
      if (!isChannelHealthy()) {
        setReconnectTrigger((t) => t + 1);
      }
    }
    // Safari restores pages from the back/forward cache with their sockets
    // closed; the effect does not re-run, so force a fresh channel.
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
      if (!isChannelHealthy()) {
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
      if (channelRef.current === channel) channelRef.current = null;
      client.removeChannel(channel);
    };
  }, [client, roomId, reconnectTrigger, ingestEvents, soundboardListeners]);

  return stateToGameEngine(game, state, dispatch, {
    connectionState,
    lastMessageAt,
    reconnect,
    watchers,
    watcherList,
    soundboard,
  });
}

/** presenceKey identifies what announcePresence sends. */
function presenceKey(role: PresenceRole | null, identity?: PresenceIdentity) {
  return role === "spectator" && identity
    ? `${role}:${identity.userId}:${identity.name}`
    : String(role);
}

/** announcePresence tracks this client's role on the channel, or stops
 * tracking it. Presence is best-effort: failures only affect the count. */
function announcePresence(
  channel: RealtimeChannel,
  role: PresenceRole | null,
  identity?: PresenceIdentity,
) {
  const request = role
    ? channel.track(
        role === "spectator" && identity
          ? { role, userId: identity.userId, name: identity.name }
          : { role },
      )
    : channel.untrack();
  request.catch((err: unknown) =>
    console.warn("Realtime presence update failed:", err),
  );
}
