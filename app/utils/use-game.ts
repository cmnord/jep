import { createClient } from "@supabase/supabase-js";
import * as React from "react";

import { Game, Clue } from "~/models/convert.server";
import { isJoinEvent, RoomEventType } from "~/models/room-event";
import { RoomEvent } from "~/models/room-event.server";
import { generateGrid } from "~/utils/utils";

export enum GameState {
  Preview = "Preview",
  Open = "Open",
  Prompt = "Prompt",
}

interface State {
  type: GameState;
  activeClue?: [number, number];
  game: Game;
  isAnswered: boolean[][];
  numAnswered: number;
  numCluesInBoard: number;
  players: Set<string>;
  round: number;
}

function createInitialState(
  arg: { game: Game; serverRoomEvents: RoomEvent[] },
  round: number
): State {
  const board = arg.game.boards[round];

  const numCluesInBoard = board.categories.reduce(
    (acc, category) => (acc += category.clues.length),
    0
  );
  const n = board.categories[0].clues.length;
  const m = board.categories.length;

  return {
    type: GameState.Preview,
    game: arg.game,
    isAnswered: generateGrid(n, m, false),
    numAnswered: 0,
    numCluesInBoard,
    players: new Set(
      arg.serverRoomEvents.filter(isJoinEvent).map((e) => e.payload.userId)
    ),
    round,
  };
}

enum ActionType {
  DismissPreview = "DismissPreview",
  ClickClue = "ClickClue",
  AnswerClue = "AnswerClue",
  PlayerJoin = "PlayerJoin",
}

interface Action {
  type: ActionType;
  payload?: unknown;
}

interface IndexedAction extends Action {
  type: ActionType.ClickClue;
  payload: [number, number];
}

interface PlayerJoinAction extends Action {
  type: ActionType.PlayerJoin;
  payload: string;
}

function isIndexedAction(action: Action): action is IndexedAction {
  return action.type === ActionType.ClickClue;
}

function isPlayerJoinAction(action: Action): action is PlayerJoinAction {
  return action.type === ActionType.PlayerJoin;
}

/** gameReducer is the state machine which implements the game. */
function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.DismissPreview:
      const nextState = { ...state };

      nextState.type = GameState.Open;

      return nextState;
    case ActionType.ClickClue: {
      if (isIndexedAction(action)) {
        const [i, j] = action.payload;
        if (state.isAnswered[i][j]) {
          return state;
        }

        const nextState = { ...state };
        nextState.type = GameState.Prompt;
        nextState.activeClue = [i, j];

        return nextState;
      }
      throw new Error("ClickClue action must have an associated index");
    }
    case ActionType.AnswerClue: {
      const newNumAnswered = state.numAnswered + 1;

      if (newNumAnswered === state.numCluesInBoard) {
        const newRound = state.round++;
        const nextState = createInitialState(
          { game: state.game, serverRoomEvents: [] },
          newRound
        );
        return nextState;
      }

      const nextState = { ...state };
      const activeClue = state.activeClue;
      if (!activeClue) {
        throw new Error("cannot answer clue if no clue was active");
      }
      const [i, j] = activeClue;
      nextState.isAnswered[i][j] = true;
      nextState.activeClue = undefined;
      nextState.type = GameState.Open;
      nextState.numAnswered = newNumAnswered;

      return nextState;
    }
    case ActionType.PlayerJoin: {
      if (isPlayerJoinAction(action)) {
        const nextState = { ...state };
        nextState.players.add(action.payload);
        return nextState;
      }
      throw new Error("PlayerJoin action must have an associated userId");
    }
  }
}

/** processRoomEvent dispatches the appropriate Action to the reducer based on
 * the room event. */
function processRoomEvent(
  roomEvent: RoomEvent,
  dispatch: React.Dispatch<Action>
) {
  switch (roomEvent.type) {
    case RoomEventType.Join:
      if (isJoinEvent(roomEvent)) {
        dispatch({
          type: ActionType.PlayerJoin,
          payload: roomEvent.payload.userId,
        });
      }
  }
}

/** useGame provides all the state variables associated with a game and methods
 * to change them. */
export function useGame(
  game: Game,
  serverRoomEvents: RoomEvent[],
  roomId: number,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
) {
  const [roomEvents, setRoomEvents] = React.useState(serverRoomEvents);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 1,
      },
    },
  });

  // TODO: spectator, points, names

  React.useEffect(() => {
    setRoomEvents(serverRoomEvents);
  }, [serverRoomEvents]);

  const [state, dispatch] = React.useReducer(
    gameReducer,
    { game, serverRoomEvents },
    () => createInitialState({ game, serverRoomEvents }, 0)
  );

  React.useEffect(() => {
    const channel = client
      .channel(`room:${roomId}`)
      .on<RoomEvent>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_events",
          filter: "room_id=eq." + roomId,
        },
        (payload) => {
          const newEvent: RoomEvent = payload.new;
          // Only process events we haven't seen yet
          if (!roomEvents.find((re) => re.id === newEvent.id)) {
            setRoomEvents((prev) => [...prev, newEvent]);
            processRoomEvent(newEvent, dispatch);
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [client, roomEvents, setRoomEvents]);

  const board = game.boards[state.round];

  let clue: Clue | undefined;
  let category: string | undefined;
  if (state.activeClue) {
    const [i, j] = state.activeClue;
    clue = state.activeClue ? board.categories[j].clues[i] : undefined;
    category = state.activeClue ? board.categoryNames[j] : undefined;
  }

  const onClickClue = (i: number, j: number) => {
    dispatch({ type: ActionType.ClickClue, payload: [i, j] });
  };

  const onClosePreview = () => dispatch({ type: ActionType.DismissPreview });

  const onClosePrompt = () => {
    dispatch({ type: ActionType.AnswerClue });
  };

  const isAnswered = (i: number, j: number) => state.isAnswered[i][j];

  return {
    type: state.type,
    board,
    category,
    clue,
    isAnswered,
    onClickClue,
    onClosePreview,
    onClosePrompt,
    players: state.players,
    round: state.round,
  };
}
