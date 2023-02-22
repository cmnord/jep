import { LoaderArgs, redirect } from "@remix-run/node";

import { createRoom } from "~/models/room.server";
import { getOrCreateUserSession } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);

  const roomName = await createRoom(gameId, userId);

  return redirect("/room/" + roomName, { headers });
}
