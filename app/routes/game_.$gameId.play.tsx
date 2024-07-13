import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getValidAuthSession } from "~/models/auth";

import { createRoom } from "~/models/room.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const roomName = await createRoom(gameId, authSession?.accessToken);

  throw redirect(`/room/${roomName}`);
}
