import type { V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useMatches } from "@remix-run/react";

import GameComponent from "~/components/game";
import { GameEngineContext, useSoloGameEngine } from "~/engine";
import { getMockGame } from "~/models/mock.server";
import { BASE_URL } from "~/utils";

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader() {
  const game = await getMockGame();

  return json({ game, BASE_URL });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const gameReducer = useSoloGameEngine(data.game);

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={data.game}
        roomId={-1}
        roomName="-1-mock"
        userId="mock"
        name="mock"
        url={data.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
