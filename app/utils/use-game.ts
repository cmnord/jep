import { createClient } from "@supabase/supabase-js";
import * as React from "react";

import type { Game, Clue } from "~/models/convert.server";
import {
  applyRoomEventsToState,
  processRoomEvent,
  RoomEventType,
} from "~/models/room-event";
import type { DbRoomEvent } from "~/models/room-event.server";
import { generateGrid } from "~/utils/utils";

const CLUE_TIMEOUT_MS = 5000;

export enum GameState {
  Preview = "Preview",
  WaitForClueChoice = "WaitForClueChoice",
  ReadClue = "ReadClue",
}

export interface Player {
  userId: string;
  name: string;
}

export interface State {
  type: GameState;
  activeClue?: [number, number];
  boardControl?: string;
  buzzes?: Map<string, number>;
  game: Game;
  isAnswered: boolean[][];
  numAnswered: number;
  numCluesInBoard: number;
  players: Map<string, Player>;
  round: number;
}

function createInitialState(game: Game, round: number): State {
  const board = game.boards[round];

  const numCluesInBoard = board
    ? board.categories.reduce(
        (acc, category) => (acc += category.clues.length),
        0
      )
    : 0;
  const n = board ? board.categories[0].clues.length : 0;
  const m = board ? board.categories.length : 0;

  return {
    type: GameState.Preview,
    game: game,
    isAnswered: generateGrid(n, m, false),
    numAnswered: 0,
    numCluesInBoard,
    players: new Map(),
    round,
  };
}

export interface Action {
  type: RoomEventType;
  payload?: unknown;
}

export function isChooseClueAction(action: Action): action is {
  type: RoomEventType.ChooseClue;
  payload: { userId: string; i: number; j: number };
} {
  return (
    action.type === RoomEventType.ChooseClue &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload
  );
}

export function isPlayerAction(action: Action): action is {
  type: RoomEventType.Join | RoomEventType.ChangeName;
  payload: Player;
} {
  return (
    (action.type === RoomEventType.Join ||
      action.type === RoomEventType.ChangeName) &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "name" in action.payload
  );
}

export function isRoundAction(action: Action): action is {
  type: RoomEventType.StartRound;
  payload: { round: number };
} {
  return (
    action.type === RoomEventType.StartRound &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "round" in action.payload &&
    typeof action.payload.round === "number"
  );
}

export function isBuzzAction(action: Action): action is {
  type: RoomEventType.Buzz;
  payload: { userId: string; i: number; j: number; deltaMs: number };
} {
  return (
    action.type === RoomEventType.Buzz &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "deltaMs" in action.payload
  );
}

/** gameReducer is the state machine which implements the game. */
export function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case RoomEventType.StartRound: {
      if (isRoundAction(action)) {
        const actionRound = action.payload.round;
        if (actionRound === state.round) {
          const nextState = { ...state };
          nextState.type = GameState.WaitForClueChoice;
          return nextState;
        }
        return state;
      }
      throw new Error("StartRound action must have an associated round number");
    }
    case RoomEventType.ChooseClue: {
      if (isChooseClueAction(action)) {
        const { userId, i, j } = action.payload;
        if (
          state.type === GameState.WaitForClueChoice &&
          state.boardControl === userId &&
          !state.isAnswered[i][j]
        ) {
          const nextState = { ...state };
          nextState.type = GameState.ReadClue;
          nextState.activeClue = [i, j];
          return nextState;
        }
        return state;
      }
      throw new Error("ClickClue action must have an associated index");
    }
    case RoomEventType.Buzz: {
      if (isBuzzAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this buzz if the clue is no longer active.
        if (!activeClue) {
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, deltaMs } = action.payload;
        const [i, j] = activeClue;
        // Ignore this buzz if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          return state;
        }

        let buzzes = state.buzzes;
        if (!buzzes) {
          buzzes = new Map();
        }

        // Accept this buzz if the user has not already buzzed and the buzz came
        // in before the timeout.
        if (!buzzes.has(userId) && deltaMs <= CLUE_TIMEOUT_MS) {
          buzzes.set(userId, deltaMs);
        }

        if (buzzes.size < state.players.size) {
          const nextState = { buzzes, ...state };
          return nextState;
        }

        // Everyone has buzzed! We can evaluate the winner.
        const winningBuzz = Array.from(buzzes.entries()).reduce(
          (acc, [userId, deltaMs]) => {
            if (deltaMs < acc.deltaMs) {
              return { userId, deltaMs };
            }
            return acc;
          },
          { userId: "", deltaMs: Number.MAX_SAFE_INTEGER }
        );

        // TODO: winner checks to see if they are right
        // TODO: no one buzzed

        const newNumAnswered = state.numAnswered + 1;
        if (newNumAnswered === state.numCluesInBoard) {
          const newRound = state.round++;
          const nextState = createInitialState(state.game, newRound);
          return nextState;
        }

        const nextState: State = {
          type: GameState.WaitForClueChoice,
          activeClue: undefined,
          boardControl: winningBuzz.userId,
          buzzes: new Map(),
          game: state.game,
          isAnswered: state.isAnswered,
          numAnswered: newNumAnswered,
          numCluesInBoard: state.numCluesInBoard,
          players: state.players,
          round: state.round,
        };
        nextState.isAnswered[i][j] = true;

        return nextState;
      }
      throw new Error("Buzz action must have an associated index and delta");
    }
    case RoomEventType.Join: {
      if (isPlayerAction(action)) {
        const nextState = { ...state };
        nextState.players.set(action.payload.userId, action.payload);
        // If this is the first player joining, give them board control.
        if (nextState.players.size === 1) {
          nextState.boardControl = action.payload.userId;
        }
        return nextState;
      }
      throw new Error("PlayerJoin action must have an associated player");
    }
    case RoomEventType.ChangeName: {
      if (isPlayerAction(action)) {
        const nextState = { ...state };
        nextState.players.set(action.payload.userId, action.payload);
        return nextState;
      }
      throw new Error("PlayerChangeName action must have an associated player");
    }
  }
}

/** useGame provides all the state variables associated with a game and methods
 * to change them. */
export function useGame(
  game: Game,
  serverRoomEvents: DbRoomEvent[],
  roomId: number,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
) {
  const [seenRoomEvents, setSeenRoomEvents] = React.useState(
    new Set<number>(serverRoomEvents.map((re) => re.id))
  );

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 1,
      },
    },
  });

  // TODO: spectator, points

  const [state, dispatch] = React.useReducer(
    gameReducer,
    { game, serverRoomEvents },
    (arg) =>
      applyRoomEventsToState(
        createInitialState(arg.game, 0),
        arg.serverRoomEvents
      )
  );

  // When new room events come in, process any we haven't seen.
  React.useEffect(() => {
    for (const re of serverRoomEvents) {
      if (!seenRoomEvents.has(re.id)) {
        setSeenRoomEvents((prev) => new Set(prev).add(re.id));
        processRoomEvent(re, dispatch);
      }
    }
  }, [serverRoomEvents, seenRoomEvents]);

  React.useEffect(() => {
    const channel = client
      .channel(`room:${roomId}`)
      .on<DbRoomEvent>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_events",
          filter: "room_id=eq." + roomId,
        },
        (payload) => {
          const newEvent: DbRoomEvent = payload.new;
          // Only process events we haven't seen yet
          if (!seenRoomEvents.has(newEvent.id)) {
            setSeenRoomEvents((prev) => new Set(prev).add(newEvent.id));
            processRoomEvent(newEvent, dispatch);
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [client, seenRoomEvents, setSeenRoomEvents, roomId]);

  const board = game.boards[state.round];

  let clue: Clue | undefined;
  let category: string | undefined;
  if (state.activeClue) {
    const [i, j] = state.activeClue;
    clue = state.activeClue ? board.categories[j].clues[i] : undefined;
    category = state.activeClue ? board.categoryNames[j] : undefined;
  }

  const isAnswered = (i: number, j: number) => state.isAnswered[i][j];

  return {
    type: state.type,
    activeClue: state.activeClue,
    board,
    buzzes: state.buzzes,
    category,
    clue,
    isAnswered,
    players: state.players,
    round: state.round,
    boardControl: state.boardControl,
  };
}
