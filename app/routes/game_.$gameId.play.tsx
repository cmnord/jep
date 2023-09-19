import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { createRoom } from "~/models/room.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const roomName = await createRoom(gameId);

  throw redirect(`/room/${roomName}`);
}
