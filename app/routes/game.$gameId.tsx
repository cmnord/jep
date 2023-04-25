import type { ActionArgs } from "@remix-run/node";
import { getValidAuthSession } from "~/models/auth";
import { deleteGame, updateGameVisibility } from "~/models/game.server";

export async function action({ request, params }: ActionArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);

  if (request.method === "DELETE") {
    await deleteGame(gameId, authSession?.accessToken);
  } else if (request.method === "PATCH") {
    const formData = await request.formData();
    const visibility = formData.get("visibility");
    if (!visibility) {
      throw new Response("visibility not found", { status: 400 });
    }
    if (typeof visibility !== "string") {
      throw new Response("visibility must be a string", { status: 400 });
    }
    if (
      visibility !== "PUBLIC" &&
      visibility !== "PRIVATE" &&
      visibility !== "UNLISTED"
    ) {
      throw new Response("visibility must be PUBLIC, PRIVATE, or UNLISTED", {
        status: 400,
      });
    }
    await updateGameVisibility(gameId, visibility, authSession?.accessToken);
  } else {
    throw new Response("method not allowed", { status: 405 });
  }

  return null;
}
