import { json, LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;
  const gameId = params.gameId;

  return json({ boardId, gameId });
}

export default function Game() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>
        Playing on board {data.boardId} w/ game {data.gameId}
      </h1>
    </div>
  );
}
