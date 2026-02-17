import { useMatches } from "react-router";

import GameComponent from "~/components/game";
import { GameEngineContext, useSoloGameEngine } from "~/engine";
import { getMockGame } from "~/models/mock.server";
import { BASE_URL } from "~/utils";

import type { Route } from "./+types/mock";

export const meta: Route.MetaFunction = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader() {
  const game = await getMockGame();

  return { game, BASE_URL };
}

export default function PlayGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const gameReducer = useSoloGameEngine(loaderData.game);

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={loaderData.game}
        roomId={-1}
        roomName="-1-mock"
        userId="mock"
        name="mock"
        url={loaderData.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
