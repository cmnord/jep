import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getMockGame } from "~/models/game.server";
import { useGameEngine } from "~/engine/use-game-engine";
import { GameEngineContext } from "~/engine/use-engine-context";

export async function loader() {
  const game = await getMockGame();

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_ANON_KEY not found in process.env"
    );
  }
  const env = { SUPABASE_URL, SUPABASE_ANON_KEY };

  return json({ game, env });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const gameReducer = useGameEngine(
    data.game,
    [],
    0,
    data.env.SUPABASE_URL,
    data.env.SUPABASE_ANON_KEY
  );

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent game={data.game} userId="mock" roomName="0-mock" />
    </GameEngineContext.Provider>
  );
}
