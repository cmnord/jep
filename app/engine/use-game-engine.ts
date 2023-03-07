import * as React from "react";

import type { Clue, Game } from "~/models/convert.server";
import type { DbRoomEvent } from "~/models/room-event.server";
import useChannel from "~/utils/use-channel";

import {
  Action,
  ActionType,
  createInitialState,
  gameEngine,
  getWinningBuzzer,
  State,
} from "./engine";
import { applyRoomEventsToState, isTypedRoomEvent } from "./room-event";

function stateToGameEngine(
  game: Game,
  state: State,
  dispatch: React.Dispatch<Action>
) {
  const board = game.boards[state.round];

  let clue: Clue | undefined;
  let category: string | undefined;
  if (state.activeClue) {
    const [i, j] = state.activeClue;
    clue = state.activeClue ? board.categories[j].clues[i] : undefined;
    category = state.activeClue ? board.categoryNames[j] : undefined;
  }

  const isAnswered = (i: number, j: number) => {
    const row = state.isAnswered[i];
    return row && row[j] && row[j].isAnswered;
  };

  const answeredBy = (i: number, j: number) => {
    const row = state.isAnswered[i];
    return row && row[j] && row[j].answeredBy;
  };

  const winningBuzz = getWinningBuzzer(state.buzzes);
  const winningBuzzer = winningBuzz?.userId ?? undefined;

  return {
    type: state.type,
    activeClue: state.activeClue,
    answeredBy,
    board,
    buzzes: state.buzzes,
    category,
    clue,
    soloDispatch: dispatch,
    isAnswered,
    players: state.players,
    numAnswered: state.numAnswered,
    numCluesInBoard: state.numCluesInBoard,
    round: state.round,
    boardControl: state.boardControl,
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
  const [seenRoomEvents, setSeenRoomEvents] = React.useState(
    new Set(serverRoomEvents.map((re) => re.id))
  );

  // TODO: spectators who cannot buzz

  const [state, dispatch] = React.useReducer(
    gameEngine,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(createInitialState(arg.game), arg.serverRoomEvents)
  );

  // When new room events come in, re-process the entire state.
  React.useEffect(() => {
    dispatch({ type: ActionType.Reset });
    for (const re of serverRoomEvents) {
      if (!isTypedRoomEvent(re)) {
        throw new Error("unhandled room event type from DB: " + re.type);
      }
      dispatch(re);
    }
    setSeenRoomEvents(new Set(serverRoomEvents.map((re) => re.id)));
  }, [serverRoomEvents]);

  useChannel<DbRoomEvent>({
    channelName: `roomId:${roomId}`,
    table: "room_events",
    filter: "room_id=eq." + roomId,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    callback: (payload) => {
      const newEvent: DbRoomEvent = payload.new;
      if (!isTypedRoomEvent(newEvent)) {
        throw new Error("unhandled room event type from DB: " + newEvent.type);
      }
      // Only process events we haven't seen yet
      if (!seenRoomEvents.has(newEvent.id)) {
        setSeenRoomEvents((prev) => new Set(prev).add(newEvent.id));
        dispatch(newEvent);
      }
    },
  });

  return stateToGameEngine(game, state, dispatch);
}
