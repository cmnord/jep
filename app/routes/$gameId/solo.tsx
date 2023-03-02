import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext } from "~/engine";
import { useSoloGameEngine } from "~/engine/use-game-engine";
import { getGame } from "~/models/game.server";

export async function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }
  const game = await getGame(gameId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  return json({ game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useSoloGameEngine(data.game);

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent game={data.game} userId="mock" roomName="solo" />
    </GameEngineContext.Provider>
  );
}
