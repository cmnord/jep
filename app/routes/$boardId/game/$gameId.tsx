import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { SoupGame } from "~/models/soup.server";
import { cache } from "~/models/cache.server";
import { Game } from "~/models/convert.server";

export async function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  const airDate = new Date(2020, 2, 14);
  const cacheKey = airDate.toISOString();

  const cachedGame: Game | undefined = cache.get(cacheKey);
  if (cachedGame) {
    return json({
      gameId,
      game: cachedGame,
    });
  }

  const newGame = new SoupGame(airDate.getTime());
  await newGame.parseGame();
  const game = newGame.jsonify();

  cache.set(cacheKey, game, 60 * 60 * 24);

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
