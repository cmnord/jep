import { LoaderArgs, redirect } from "@remix-run/node";

import { makeRoomId } from "~/utils/utils";

export function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;

  const roomId = makeRoomId();

  return redirect("/" + gameId + "/room/" + roomId);
}
