import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { ActionType, GameEngineContext, useGameEngine } from "~/engine";
import { isPlayerAction } from "~/engine/actions";
import { isTypedRoomEvent } from "~/engine/room-event";
import { getGame } from "~/models/game.server";
import { createRoomEvent, getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
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

  const game = await getGame(room.game_id);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);

  const roomEvents = await getRoomEvents(room.id);
  const userInRoom = roomEvents
    .filter(isTypedRoomEvent)
    .find((e) => isPlayerAction(e) && e.payload.userId === userId);

  if (!userInRoom) {
    const joinEvent = await createRoomEvent(room.id, ActionType.Join, {
      userId,
      name: getRandomName(),
    });
    roomEvents.push(joinEvent);
  }

  const env = { SUPABASE_URL, SUPABASE_ANON_KEY };

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
