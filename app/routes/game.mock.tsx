import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import fs from "fs";

import GameComponent from "~/components/game";
import { Convert } from "~/models/convert.server";

export async function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  // Find the absolute path of the json directory
  // Note: Vercel doesn't include the json directory when using process.cwd() or
  // path.join(). The workaround is to use __dirname and concatenate the json
  // directory to it.
  const jsonDirectory = __dirname + "/../app/static";
  // Read the json data file data.json
  const fileContents = await fs.promises.readFile(
    jsonDirectory + "/mock.jep.json",
    "utf8"
  );

  const game = Convert.toGame(fileContents);

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
