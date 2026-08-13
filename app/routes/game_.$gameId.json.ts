import { getValidAuthSession } from "~/models/auth";
import { gameToJson, getGame } from "~/models/game.server";

import type { Route } from "./+types/game_.$gameId.json";

export async function loader({ request, params }: Route.LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(gameId, authSession?.userId);

  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  return new Response(gameToJson(game), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${game.id}.jep.json"`,
      // The HTML preview is the useful search result; this route is only the
      // machine-readable game download and would otherwise duplicate it.
      "X-Robots-Tag": "noindex",
    },
  });
}
