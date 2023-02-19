import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getGame } from "~/models/game.server";

export async function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;
  const roomId = params.roomId;

  if (!gameId) {
    throw new Response("game ID not found in URL params", { status: 404 });
  }
  if (!roomId) {
    throw new Response("room ID not found in URL params", { status: 404 });
  }

  const game = await getGame(gameId);

  return json({ roomId, game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <p>playing in room {data.roomId}</p>
      <GameComponent game={data.game} />
    </div>
  );
}
