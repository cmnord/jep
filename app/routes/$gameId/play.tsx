import { redirect } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";

import { createRoom } from "~/models/room.server";

export async function loader({ params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const roomName = await createRoom(gameId);

  return redirect("/room/" + roomName);
}
