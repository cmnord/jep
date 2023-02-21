import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getMockGame } from "~/models/game.server";
import { useGame } from "~/utils/use-game";
import { GameContext } from "~/utils/use-game-context";

export async function loader() {
  const game = await getMockGame();

  return json({ game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useGame(data.game);

  return (
    <GameContext.Provider value={gameReducer}>
      <GameComponent game={data.game} />;
    </GameContext.Provider>
  );
}
