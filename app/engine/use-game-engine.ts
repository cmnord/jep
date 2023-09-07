import * as React from "react";

import type { AuthSession } from "~/models/auth";
import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import { getSupabase } from "~/supabase";

import type { Action } from "./engine";
import { gameEngine, getWinningBuzzer } from "./engine";
import { applyRoomEventsToState, isTypedRoomEvent } from "./room-event";
import { getClueValue, State, stateFromGame } from "./state";

function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>,
  { connected, lastMessageAt }: { connected: boolean; lastMessageAt?: number },
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

  const winningBuzz = getWinningBuzzer(state.buzzes);
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
    connected,
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
    connected: true,
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
 * and the engine will apply it to the state. */
export function useGameEngine(
  game: Game,
  serverRoomEvents: DbRoomEvent[],
  roomId: number,
  accessToken?: AuthSession["accessToken"],
) {
  const [, setRoomEvents] = React.useState(serverRoomEvents);

  const [connected, setConnected] = React.useState(false);
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
    const channel = client.channel(`realtime:roomId:${roomId}`);
    if (channel.state !== "closed") {
      return;
    }

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
          if (!isTypedRoomEvent(newEvent)) {
            throw new Error(
              "unhandled room event type from DB: " + newEvent.type,
            );
          }
          // Use setRoomEvents instead of roomEvents directly so roomEvents
          // is not a dependency of the useEffect hook
          setRoomEvents((re) => {
            // Only process events we haven't seen yet
            if (!re.find((re) => re.id === newEvent.id)) {
              setRoomEvents((prev) => [...prev, newEvent]);
              dispatch(newEvent);
            }
            return re;
          });
        },
      )
      .subscribe((status, err) => {
        console.info(status);
        if (err) {
          throw new Error("Realtime subscription error:" + err.message);
        }
        switch (status) {
          case "SUBSCRIBED":
            return setConnected(true);
          case "CHANNEL_ERROR":
          case "CLOSED":
          case "TIMED_OUT":
            return setConnected(false);
          default:
            throw new Error("unhandled channel status: " + status);
        }
      });

    channel.socket.conn?.addEventListener("message", () => {
      setLastMessageAt(Date.now());
    });

    // cleanup function to unsubscribe from the channel
    return () => {
      if (channel.state === "joined") {
        console.info("unsubscribing from channel", channel.state);
        channel.unsubscribe();
        client.removeChannel(channel);
      }
    };
  }, [client, roomId]);

  return stateToGameEngine(game, state, dispatch, { connected, lastMessageAt });
}
