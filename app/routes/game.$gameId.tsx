import { redirect } from "react-router";
import { z } from "zod";

import { getValidAuthSession } from "~/models/auth";
import {
  deleteGame,
  gameToJson,
  getGame,
  updateGameVisibility,
} from "~/models/game.server";
import { flashFormState } from "~/session.server";
import { parseFormData } from "~/utils/http.server";

import type { Route } from "./+types/game.$gameId";

const visibilitySchema = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]),
});

export async function action({ request, params }: Route.ActionArgs) {
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

    throw redirect("/profile", { headers });
  } else if (request.method === "PATCH") {
    const formData = await request.formData();
    const { visibility } = parseFormData(formData, visibilitySchema);

    const game = await updateGameVisibility(
      gameId,
      visibility,
      authSession?.accessToken,
    );

    const formState = {
      success: true,
      message: `Updated game ${game.title} to ${visibility}.`,
    };
    const headers = await flashFormState(request, formState);

    throw redirect("/profile", { headers });
  } else {
    throw new Response("method not allowed", { status: 405 });
  }
}

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

  const json = gameToJson(game);

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
