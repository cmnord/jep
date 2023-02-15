import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getMockGame } from "~/models/game.server";

export async function loader() {
  const game = await getMockGame();

  return json({ game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return <GameComponent game={data.game} />;
}
