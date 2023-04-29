import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getValidAuthSession } from "~/models/auth";
import {
  deleteGame,
  gameToJson,
  getGame,
  updateGameVisibility,
} from "~/models/game.server";
import { flashFormState } from "~/session.server";

export async function action({ request, params }: ActionArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);

  if (request.method === "DELETE") {
    const game = await deleteGame(gameId, authSession?.accessToken);

    const formState = {
      success: true,
      message: `Game ${game?.title} deleted.`,
    };
    const headers = await flashFormState(request, formState);

    return redirect("/profile", { headers });
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

    const game = await updateGameVisibility(
      gameId,
      visibility,
      authSession?.accessToken
    );

    const formState = {
      success: true,
      message: `Updated game ${game.title} to ${visibility}.`,
    };
    const headers = await flashFormState(request, formState);

    return redirect("/profile", { headers });
  } else {
    throw new Response("method not allowed", { status: 405 });
  }
}

export async function loader({ request, params }: LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(gameId, authSession?.userId);

  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const json = gameToJson(game);

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
