import { LoaderArgs, redirect } from "@remix-run/node";

import { makeGameId } from "~/utils/utils";

export function loader({ params }: LoaderArgs) {
  const boardId = params.boardId;

  const gameId = makeGameId();

  return redirect("/" + boardId + "/game/" + gameId);
}
