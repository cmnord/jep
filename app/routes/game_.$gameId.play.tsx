import { redirect } from "react-router";

import { getValidAuthSession } from "~/models/auth";
import { createRoom } from "~/models/room.server";

import type { Route } from "./+types/game_.$gameId.play";

export async function loader({ request, params }: Route.LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const roomName = await createRoom(gameId, authSession?.accessToken);

  const url = new URL(request.url);
  const redirectUrl = new URL(`/room/${roomName}`, url.origin);
  // Preserve query parameters (e.g. ?mode=host) on redirect
  for (const [key, value] of url.searchParams) {
    redirectUrl.searchParams.set(key, value);
  }
  throw redirect(redirectUrl.pathname + redirectUrl.search);
}
