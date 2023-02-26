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

/** CLUE_TIMEOUT_MS is the total amount of time a contestant has to buzz in after
 * the clue is read. */
export const CLUE_TIMEOUT_MS = 5000;

export enum GameState {
  Preview = "Preview",
  WaitForClueChoice = "WaitForClueChoice",
  ReadClue = "ReadClue",
  RevealAnswerToBuzzer = "RevealAnswerToBuzzer",
  RevealAnswerToAll = "RevealAnswerToAll",
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

export function isClueAction(action: Action): action is {
  type: RoomEventType.ChooseClue | RoomEventType.NextClue;
  payload: { userId: string; i: number; j: number };
} {
  return (
    (action.type === RoomEventType.ChooseClue ||
      action.type === RoomEventType.NextClue) &&
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

export function isAnswerAction(action: Action): action is {
  type: RoomEventType.Answer;
  payload: { userId: string; i: number; j: number; correct: boolean };
} {
  return (
    action.type === RoomEventType.Answer &&
    action.payload !== null &&
    typeof action.payload === "object" &&
    "userId" in action.payload &&
    "i" in action.payload &&
    "j" in action.payload &&
    "correct" in action.payload
  );
}

function getWinningBuzzer(buzzes?: Map<string, number>):
  | {
      userId: string;
      deltaMs: number;
    }
  | undefined {
  if (!buzzes) {
    return undefined;
  }
  return Array.from(buzzes.entries()).reduce(
    (acc, [userId, deltaMs]) => {
      if (deltaMs < acc.deltaMs) {
        return { userId, deltaMs };
      }
      return acc;
    },
    { userId: "", deltaMs: CLUE_TIMEOUT_MS + 1 }
  );
}

/** gameReducer is the state machine which implements the game. */
export function gameReducer(state: State, action: Action): State {
  switch (action.type) {
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
      if (isClueAction(action)) {
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

        if (deltaMs <= CLUE_TIMEOUT_MS && buzzes.size < state.players.size) {
          const nextState = { buzzes, ...state };
          return nextState;
        }

        // Evaluate the winner if either:
        //   1. All players have buzzed
        //   2. At least one player has submitted a > 5sec buzz
        // If we missed someone's < 5sec buzz at this point, that's too bad.
        const winningBuzz = getWinningBuzzer(buzzes);

        // 1. No one buzzed in: reveal the answer to everyone and mark it as
        // answered
        if (!winningBuzz?.userId) {
          const nextState = {
            ...state,
            type: GameState.RevealAnswerToAll,
            numAnswered: state.numAnswered + 1,
          };
          nextState.isAnswered[i][j] = true;
          return nextState;
        }

        // 2. One person buzzed before the time: reveal the answer to only them, let them evaluate correct / no
        return { ...state, type: GameState.RevealAnswerToBuzzer };
      }
      throw new Error("Buzz action must have an associated index and delta");
    }
    case RoomEventType.Answer:
      if (isAnswerAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue) {
          return state;
        }
        const { userId, i: buzzI, j: buzzJ, correct } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (buzzI !== i || buzzJ !== j) {
          return state;
        }
        // Ignore the answer if it was not from the winning buzzer.
        const winningBuzzer = getWinningBuzzer(state.buzzes);
        if (userId !== winningBuzzer?.userId) {
          return state;
        }

        if (!correct) {
          // If the buzzer was wrong, re-open the buzzers to everyone except that
          // buzzer
          const nextState: State = {
            ...state,
            type: GameState.ReadClue,
            buzzes: new Map([[userId, CLUE_TIMEOUT_MS + 1]]),
          };
          return nextState;
        }

        // If the buzzer was right, reveal the answer to everyone and give the
        // winning buzzer board control.
        // TODO: award points.
        const nextState = {
          ...state,
          type: GameState.RevealAnswerToAll,
          boardControl: userId,
          numAnswered: state.numAnswered + 1,
        };
        nextState.isAnswered[i][j] = true;
        return nextState;
      }
      throw new Error(
        "Answer action must have an associated index and correct/incorrect"
      );
    case RoomEventType.NextClue:
      if (isClueAction(action)) {
        const activeClue = state.activeClue;
        // Ignore this answer if the clue is no longer active.
        if (!activeClue) {
          return state;
        }
        // TODO: make use of user ID?
        const { i: actionI, j: actionJ } = action.payload;
        const [i, j] = activeClue;
        // Ignore this answer if it was for the wrong clue.
        if (actionI !== i || actionJ !== j) {
          return state;
        }

        if (state.numAnswered === state.numCluesInBoard) {
          const newRound = state.round + 1;
          // TODO: preserve points
          const board = state.game.boards[newRound];

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
            boardControl: state.boardControl,
            game: state.game,
            isAnswered: generateGrid(n, m, false),
            numAnswered: 0,
            numCluesInBoard,
            players: state.players,
            round: newRound,
          };
        }

        return {
          ...state,
          type: GameState.WaitForClueChoice,
          activeClue: undefined,
          buzzes: new Map(),
        };
      }
      throw new Error("NextClue action must have an associated user");
  }
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

  const winningBuzz = getWinningBuzzer(state.buzzes);
  const winningBuzzer = winningBuzz?.userId ?? undefined;

  return {
    type: state.type,
    activeClue: state.activeClue,
    board,
    buzzes: state.buzzes,
    category,
    clue,
    isAnswered,
    players: state.players,
    numAnswered: state.numAnswered,
    numCluesInBoard: state.numCluesInBoard,
    round: state.round,
    boardControl: state.boardControl,
    winningBuzzer,
  };
}
