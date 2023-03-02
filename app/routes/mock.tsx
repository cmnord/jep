import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext } from "~/engine";
import { useSoloGameEngine } from "~/engine/use-game-engine";
import { getMockGame } from "~/models/game.server";

export async function loader() {
  const game = await getMockGame();

  return json({ game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useSoloGameEngine(data.game, "mock", "mock");

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent game={data.game} userId="mock" roomName="solo" />
    </GameEngineContext.Provider>
  );
}
