import * as React from "react";

import type { AuthSession } from "~/models/auth";
import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";

import type { Action } from "./engine";
import { gameEngine, getWinningBuzzer } from "./engine";
import { applyRoomEventsToState, isTypedRoomEvent } from "./room-event";
import { State, getClueValue, stateFromGame } from "./state";

export enum ConnectionState {
  ERROR,
  CONNECTING,
  CONNECTED,
  DISCONNECTING,
  DISCONNECTED,
}

/** RESUBSCRIBE_DELAY_MS is the amount of time we wait before attemping to
 * re-subscribe to the realtime channel.
 */
const RESUBSCRIBE_DELAY_MS = 1000;

function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
  {
    connectionState,
    lastMessageAt,
  }: { connectionState: ConnectionState; lastMessageAt?: number },
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
    board,
    buzzes: state.buzzes,
    category,
    clue,
    connectionState,
    getClueValue: getClueValueFn,
    soloDispatch: dispatch,
    isAnswered,
    lastMessageAt,
    players: state.players,
    round: state.round,
    boardControl: state.boardControl,
    wagers: state.wagers.get(clueKey) ?? new Map<string, number>(),
    winningBuzzer,
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
  const [, setRoomEvents] = React.useState(serverRoomEvents);

  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [lastMessageAt, setLastMessageAt] = React.useState<
    number | undefined
  >();

  const [state, dispatch] = React.useReducer(
    gameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(stateFromGame(arg.game), arg.serverRoomEvents),
  );

  const client = React.useMemo(() => getSupabase(accessToken), [accessToken]);

  React.useEffect(() => {
    let channel = client.channel(`realtime:roomId:${roomId}`);
    let numRetries = 0;

    function subscribeToChannel() {
      if (numRetries > 5) {
        return;
      }
      setConnectionState(ConnectionState.CONNECTING);
      numRetries += 1;

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
            setRoomEvents((re) => {
              if (!re.find((re) => re.id === newEvent.id)) {
                setRoomEvents((prev) => [...prev, newEvent]);
                dispatch(newEvent);
              }
              return re;
            });
          },
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("Realtime subscription error:", err.message);
            setConnectionState(ConnectionState.ERROR);
            // Handle the error here by attempting to re-subscribe
            if (channel) {
              setConnectionState(ConnectionState.DISCONNECTING);
              channel.unsubscribe();
            }
            channel = client.channel(`realtime:roomId:${roomId}`);
            setTimeout(subscribeToChannel, RESUBSCRIBE_DELAY_MS);
          } else {
            console.info(status, numRetries);
            switch (status) {
              case "SUBSCRIBED":
                return setConnectionState(ConnectionState.CONNECTED);
              case "CLOSED":
                return setConnectionState(ConnectionState.DISCONNECTED);
              case "CHANNEL_ERROR":
                channel = client.channel(`realtime:roomId:${roomId}`);
                setTimeout(subscribeToChannel, RESUBSCRIBE_DELAY_MS);
                return setConnectionState(ConnectionState.ERROR);
              case "TIMED_OUT":
                channel = client.channel(`realtime:roomId:${roomId}`);
                setTimeout(subscribeToChannel, RESUBSCRIBE_DELAY_MS);
                return setConnectionState(ConnectionState.ERROR);
              default:
                throw new Error("unhandled channel status: " + status);
            }
          }
        });
    }

    subscribeToChannel();

    // cleanup function to unsubscribe from the channel
    return () => {
      if (channel.state === "joined") {
        console.info("unsubscribing from channel", channel.state);
        setConnectionState(ConnectionState.DISCONNECTING);
        channel.unsubscribe();
        client.removeChannel(channel);
      }
    };
  }, [client, roomId]);

  return stateToGameEngine(game, state, dispatch, {
    connectionState,
    lastMessageAt,
  });
}
