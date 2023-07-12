import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useMatches } from "@remix-run/react";

import GameComponent from "~/components/game";
import {
  ActionType,
  GameEngineContext,
  GameState,
  State,
  useGameEngine,
} from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { createRoomEvent, getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { BASE_URL, getRandomName } from "~/utils";

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader({ request, params }: LoaderArgs) {
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const roomId = parseInt(roomName.split("-")[0]);
  const room = await getRoom(roomId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const user = authSession
    ? await getUserByEmail(authSession.email, authSession.accessToken)
    : null;
  const accessToken = authSession?.accessToken;

  const roomEvents = await getRoomEvents(room.id);
  // Construct the state of the game from the room events on the backend to see
  // if the game is over.
  const state = applyRoomEventsToState(State.fromGame(game), roomEvents);

  // Add the user to the room if they aren't already in it and the game isn't
  // over.
  // - If they are logged in, their ID is their user ID.
  // - If they are a guest, their ID is their guest session ID.
  if (user) {
    const userId = user.id;
    const userInRoom = state.players.get(userId) !== undefined;
    if (!userInRoom && state.type !== GameState.GameOver) {
      const joinEvent = await createRoomEvent(room.id, ActionType.Join, {
        userId,
        name: getRandomName(),
      });
      roomEvents.push(joinEvent);
    }
    return json({
      game,
      roomEvents,
      roomId,
      userId,
      BASE_URL,
      accessToken,
    });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  const guestInRoom = state.players.get(userId) !== undefined;
  if (!guestInRoom && state.type !== GameState.GameOver) {
    const joinEvent = await createRoomEvent(room.id, ActionType.Join, {
      userId,
      name: getRandomName(),
    });
    roomEvents.push(joinEvent);
  }
  return json(
    {
      game,
      roomEvents,
      roomId,
      accessToken,
      userId,
      BASE_URL,
    },
    { headers },
  );
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const gameReducer = useGameEngine(
    data.game,
    data.roomEvents,
    data.roomId,
    data.accessToken,
  );

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={data.game}
        roomId={data.roomId}
        userId={data.userId}
        url={data.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
