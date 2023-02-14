import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import fs from "fs";
import path from "path";

import Game from "~/components/game";
import { Convert } from "~/models/convert.server";

export async function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  const fullPath = path.join(process.cwd(), "app/static/mock.jep.json");
  const file = await fs.promises.readFile(fullPath);

  const game = Convert.toGame(file.toString());

  return json({
    boardId,
    gameId,
    game,
  });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  return <Game game={data.game} />;
}
