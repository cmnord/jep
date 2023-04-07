import { createClient } from "@supabase/supabase-js";
import * as React from "react";

import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";

import type { Action, State } from "./engine";
import {
  createInitialState,
  gameEngine,
  getClueValue,
  getWinningBuzzer,
} from "./engine";
import { applyRoomEventsToState, isTypedRoomEvent } from "./room-event";

function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>
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
    return state.isAnswered.at(i)?.at(j)?.isAnswered ?? false;
  };

  const answeredBy = (i: number, j: number, userId: string) => {
    return state.isAnswered.at(i)?.at(j)?.answeredBy.get(userId);
  };

  const winningBuzz = getWinningBuzzer(state.buzzes);
  const winningBuzzer = winningBuzz?.userId ?? undefined;

  function getClueValueFn(idx: [number, number], userId: string) {
    return getClueValue(state, idx, userId);
  }

  return {
    type: state.type,
    activeClue: state.activeClue,
    /** answeredBy checks whether the user answered the given clue and whether
     * they were correct.
     */
    answeredBy,
    answers: state.answers,
    board,
    buzzes: state.buzzes,
    category,
    clue,
    getClueValue: getClueValueFn,
    soloDispatch: dispatch,
    isAnswered,
    players: state.players,
    numCluesLeftInRound: state.numCluesInBoard - state.numAnswered,
    round: state.round,
    boardControl: state.boardControl,
    wagers: state.wagers,
    winningBuzzer,
  };
}

/** useSoloGameEngine handles solo play by setting the players and board control
 * for one player without any server room events. This means that once the page
 * refreshes the game loses all progress.
 */
export function useSoloGameEngine(game: Game, userId: string, name: string) {
  const [state, dispatch] = React.useReducer(gameEngine, game, (arg) => {
    const init = createInitialState(arg);
    init.players.set(userId, { name, userId, score: 0 });
    init.boardControl = userId;
    return init;
  });

  return stateToGameEngine(game, state, dispatch);
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
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
) {
  const [roomEvents, setRoomEvents] = React.useState(serverRoomEvents);

  // TODO: spectators who cannot buzz

  const [state, dispatch] = React.useReducer(
    gameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(createInitialState(arg.game), arg.serverRoomEvents)
  );

  const client = React.useMemo(
    () =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 1,
          },
        },
      }),
    [SUPABASE_ANON_KEY, SUPABASE_URL]
  );

  React.useEffect(() => {
    const channel = client.channel(`realtime:roomId:${roomId}`);
    if (channel.state !== "closed") {
      return;
    }
    try {
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
                "unhandled room event type from DB: " + newEvent.type
              );
            }
            // Only process events we haven't seen yet
            if (!roomEvents.find((re) => re.id === newEvent.id)) {
              setRoomEvents((prev) => [...prev, newEvent]);
              dispatch(newEvent);
            }
          }
        )
        .subscribe((status, err) => {
          console.info(status);
          if (err) {
            throw err;
          }
        });

      // cleanup function to unsubscribe from the channel
      return () => {
        if (channel.state === "joined") {
          console.info("unsubscribing from channel", channel.state);
          channel.unsubscribe();
          client.removeChannel(channel);
        }
      };
    } catch (error) {
      console.error(error);
    }
  }, [client, roomId, roomEvents]);

  return stateToGameEngine(game, state, dispatch);
}
