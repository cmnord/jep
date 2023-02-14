import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { SoupGame } from "~/models/soup.server";

export async function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  const newGame = new SoupGame("02", "14", "2020");
  await newGame.parseGame();
  const game = newGame.jsonify();

  if (!game) {
    throw new Error("failed to jsonify game.");
  }

  return json({
    boardId,
    gameId,
    game,
  });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return <GameComponent game={data.game} />;
}
