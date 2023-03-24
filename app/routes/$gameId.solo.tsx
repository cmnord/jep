import type { LoaderArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext, useSoloGameEngine } from "~/engine";
import { getGame } from "~/models/game.server";
import { getOrCreateUserSession } from "~/session.server";
import { getRandomName } from "~/utils/name";

export const meta: MetaFunction<typeof loader> = ({ data }) => ({
  title: data.game.title,
});

export async function loader({ request, params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }
  const game = await getGame(gameId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  const name = getRandomName();

  return json({ game, userId, name }, { headers });
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
