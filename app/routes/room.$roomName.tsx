import { data, redirect, useMatches } from "react-router";

import GameComponent from "~/components/game";
import { ActionType, GameEngineContext, useGameEngine } from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { createRoomEvent, getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession, getUserSession } from "~/session.server";
import { BASE_URL, getRandomEmoji } from "~/utils";

import type { Route } from "./+types/room.$roomName";

export const meta: Route.MetaFunction = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader({ request, params }: Route.LoaderArgs) {
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

    // Check if this authenticated user was previously playing as an anonymous
    // guest. If so, transfer the anonymous player to their authenticated
    // identity so they keep their score and participation. If the
    // authenticated user is already in the game too, the anonymous player is
    // retired to leftPlayers so it doesn't block the game.
    const anonymousUserId = await getUserSession(request);
    if (
      anonymousUserId &&
      anonymousUserId !== userId &&
      state.players.has(anonymousUserId)
    ) {
      await createRoomEvent(
        room.id,
        ActionType.TransferPlayer,
        { oldUserId: anonymousUserId, newUserId: userId },
        accessToken,
      );
      // Re-fetch room events to include the transfer.
      const updatedRoomEvents = await getRoomEvents(room.id, accessToken);
      return {
        game,
        name,
        roomEvents: updatedRoomEvents,
        roomId,
        roomName,
        userId,
        BASE_URL,
        accessToken,
      };
    }

    return {
      game,
      name,
      roomEvents,
      roomId,
      roomName,
      userId,
      BASE_URL,
      accessToken,
    };
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  return data(
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

export default function PlayGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const engine = useGameEngine(
    loaderData.game,
    loaderData.roomEvents,
    loaderData.roomId,
    loaderData.accessToken,
  );

  return (
    <GameEngineContext.Provider value={engine}>
      <GameComponent
        game={loaderData.game}
        name={loaderData.name}
        roomId={loaderData.roomId}
        roomName={loaderData.roomName}
        userId={loaderData.userId}
        url={loaderData.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
