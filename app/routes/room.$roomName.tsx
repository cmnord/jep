import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useMatches } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext, useGameEngine } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getRoomEvents } from "~/models/room-event.server";
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

  const roomParts = roomName.split("-");
  const roomId = parseInt(roomParts[0]);
  const roomWord = roomParts[1];
  const room = await getRoom(roomId);
  if (!room || room.name !== roomWord) {
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
  const name = getRandomName();

  if (user) {
    const userId = user.id;
    return json({
      game,
      name,
      roomEvents,
      roomId,
      roomName,
      userId,
      BASE_URL,
      accessToken,
    });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  return json(
    {
      game,
      name,
      roomEvents,
      roomId,
      roomName,
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
        name={data.name}
        roomId={data.roomId}
        roomName={data.roomName}
        userId={data.userId}
        url={data.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
