import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useMatches } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext, useGameEngine } from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { BASE_URL, getRandomEmoji } from "~/utils";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const roomParts = roomName.split("-");
  const roomId = parseInt(roomParts[0]);
  const roomWord = roomParts[1];
  const authSession = await getValidAuthSession(request);
  const room = await getRoom(roomId, authSession?.accessToken);
  if (!room || room.name !== roomWord) {
    throw new Response("room not found", { status: 404 });
  }

  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const user = authSession
    ? await getUserByEmail(authSession.email, authSession.accessToken)
    : null;
  const accessToken = authSession?.accessToken;

  const roomEvents = await getRoomEvents(room.id, accessToken);
  const name = getRandomEmoji();

  const state = applyRoomEventsToState(stateFromGame(game), roomEvents);

  if (state.type === GameState.GameOver) {
    return redirect(`/room/${roomName}/summary`);
  }

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

  const engine = useGameEngine(
    data.game,
    data.roomEvents,
    data.roomId,
    data.accessToken,
  );

  return (
    <GameEngineContext.Provider value={engine}>
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
