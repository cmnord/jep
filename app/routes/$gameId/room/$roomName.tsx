import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import GameComponent from "~/components/game";
import { getGame } from "~/models/game.server";
import { getRoom } from "~/models/room.server";
import { useGame } from "~/utils/use-game";
import { GameContext } from "~/utils/use-game-context";

export async function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;
  const roomNameAndId = params.roomName;

  if (!gameId) {
    throw new Response("game ID not found in URL params", { status: 404 });
  }
  if (!roomNameAndId) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const game = await getGame(gameId);
  const room = await getRoom(roomNameAndId);

  return json({ room, game });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const game = useGame(data.game);

  return (
    <GameContext.Provider value={game}>
      <GameComponent game={data.game} />
    </GameContext.Provider>
  );
}
