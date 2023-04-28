import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { ActionType, GameEngineContext, useGameEngine } from "~/engine";
import { isPlayerAction } from "~/engine/actions";
import { isTypedRoomEvent } from "~/engine/room-event";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { createRoomEvent, getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "~/utils";
import { getRandomName } from "~/utils/name";

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: data.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader({ request, params }: LoaderArgs) {
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const room = await getRoom(roomName);
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

  const roomEvents = await getRoomEvents(room.id);
  const typedRoomEvents = roomEvents.filter(isTypedRoomEvent);

  const env = { SUPABASE_URL, SUPABASE_ANON_KEY };

  // Add the user to the room if they aren't already in it.
  // If they are logged in, their ID is their user ID.
  // If they are a guest, their ID is their guest session ID.
  if (user) {
    const userId = user.id;
    const userInRoom = typedRoomEvents.some(
      (re) => isPlayerAction(re) && re.payload.userId === userId
    );
    if (!userInRoom) {
      const joinEvent = await createRoomEvent(room.id, ActionType.Join, {
        userId,
        name: getRandomName(),
      });
      roomEvents.push(joinEvent);
    }
    return json({ room, roomName, game, roomEvents, userId, env });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  const guestInRoom = typedRoomEvents.some(
    (re) => isPlayerAction(re) && re.payload.userId === userId
  );
  if (!guestInRoom) {
    const joinEvent = await createRoomEvent(room.id, ActionType.Join, {
      userId,
      name: getRandomName(),
    });
    roomEvents.push(joinEvent);
  }
  return json({ room, roomName, game, roomEvents, userId, env }, { headers });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useGameEngine(
    data.game,
    data.roomEvents,
    data.room.id,
    data.env.SUPABASE_URL,
    data.env.SUPABASE_ANON_KEY
  );

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={data.game}
        userId={data.userId}
        roomName={data.roomName}
      />
    </GameEngineContext.Provider>
  );
}
