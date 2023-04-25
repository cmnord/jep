import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext, useSoloGameEngine } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { getRandomName } from "~/utils/name";

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: data.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader({ request, params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(gameId, authSession?.accessToken);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const user = authSession
    ? await getUserByEmail(authSession.email, authSession.accessToken)
    : null;

  const name = getRandomName();

  // Add the user to the room. If they are logged in, their ID is their user ID.
  // If they are a guest, their ID is their guest session ID.
  if (user) {
    return json({ game, userId: user.id, name });
  } else {
    const headers = new Headers();
    const userId = await getOrCreateUserSession(request, headers);
    return json({ game, userId, name }, { headers });
  }
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useSoloGameEngine(data.game, data.userId, data.name);

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent game={data.game} userId={data.userId} roomName="solo" />
    </GameEngineContext.Provider>
  );
}
