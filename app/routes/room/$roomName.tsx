import { json } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getGame } from "~/models/game.server";
import { isPlayerEvent, RoomEventType } from "~/models/room-event";
import { createRoomEvent, getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getOrCreateUserSession } from "~/session.server";
import { useGame } from "~/utils/use-game";
import { GameContext } from "~/utils/use-game-context";
import { getRandomName } from "~/utils/name";

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
  const userInRoom = roomEvents.find(
    (e) => isPlayerEvent(e) && e.payload.userId === userId
  );
  if (!userInRoom) {
    const joinEvent = await createRoomEvent(room.id, RoomEventType.Join, {
      userId,
      name: getRandomName(),
    });
    roomEvents.push(joinEvent);
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_ANON_KEY not found in process.env"
    );
  }
  const env = { SUPABASE_URL, SUPABASE_ANON_KEY };

  return json({ room, roomName, game, roomEvents, userId, env }, { headers });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useGame(
    data.game,
    data.roomEvents,
    data.room.id,
    data.env.SUPABASE_URL,
    data.env.SUPABASE_ANON_KEY
  );

  return (
    <GameContext.Provider value={gameReducer}>
      <GameComponent
        game={data.game}
        userId={data.userId}
        roomName={data.roomName}
      />
    </GameContext.Provider>
  );
}
