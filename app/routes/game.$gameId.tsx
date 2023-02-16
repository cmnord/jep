import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { fetchRandomGame } from "~/models/cluebase.server";
import { cache } from "~/models/cache.server";
import { Game } from "~/models/game.server";

export async function loader({ request, params }: LoaderArgs) {
  const gameId = params.gameId;

  const url = new URL(request.url);

  const categoryStr = url.searchParams.get("categories");
  if (!categoryStr) {
    throw new Response("no categories provided", { status: 404 });
  }
  const cachedGame: Game | undefined = cache.get(categoryStr);
  if (cachedGame) {
    return json({
      gameId,
      game: cachedGame,
    });
  }

  const categoryNames = categoryStr.split(",");
  const game = await fetchRandomGame({ categoryNames });
  cache.set(categoryStr, game, 60 * 60 * 24);

  return json({
    gameId,
    game,
  });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Playing on random board w/ game {data.gameId}</h1>
      <GameComponent game={data.game} />
    </div>
  );
}
