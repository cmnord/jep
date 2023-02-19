import { LoaderArgs, redirect } from "@remix-run/node";

import { makeRoomId } from "~/utils/utils";

export function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const roomId = makeRoomId();

  return redirect("/" + gameId + "/room/" + roomId);
}
