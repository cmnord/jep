import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import Game from "~/components/game";
import { getMockGame } from "~/models/game.server";

export function loader({ request, params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  const game = getMockGame();

  return json({
    boardId,
    gameId,
    game,
    year: 0,
    month: 0,
    day: 0,
  });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>
        Playing on board {data.boardId} w/ game {data.gameId}
      </h1>
      <Game
        game={data.game}
        year={data.year}
        month={data.month}
        day={data.day}
      />
    </div>
  );
}
