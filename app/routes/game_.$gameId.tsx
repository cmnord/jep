import { redirect } from "react-router";
import { z } from "zod";

import { ButtonLink } from "~/components/button";
import { GameVisibilityTag } from "~/components/game-visibility-icon";
import Main from "~/components/main";
import { getValidAuthSession } from "~/models/auth";
import {
  deleteGame,
  getGame,
  updateGameVisibility,
} from "~/models/game.server";
import { flashFormState } from "~/session.server";
import { parseFormData } from "~/utils/http.server";
import { getPageMetadata } from "~/utils/seo";

import type { Route } from "./+types/game_.$gameId";

const visibilitySchema = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]),
});

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];

  const description =
    loaderData.game.note ||
    `Preview ${loaderData.game.title}, a trivia game by ${loaderData.game.author}, and choose how to play.`;

  return getPageMetadata(loaderData.game.title, description);
};

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

  return { game };
}

export default function GamePreview({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;

  return (
    <div className="max-w-full grow">
      <Main>
        <div className="mb-2 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-900">
            {game.title}
          </h1>
          {game.visibility !== "PUBLIC" ? (
            <GameVisibilityTag visibility={game.visibility} />
          ) : null}
        </div>
        <p className="mb-4 text-slate-500">By {game.author}</p>
        {game.note ? <p className="mb-6">{game.note}</p> : null}

        <div className="mb-8 flex flex-wrap gap-2">
          <ButtonLink to={`/game/${game.id}/play`} variant="primary">
            Play with friends
          </ButtonLink>
          <ButtonLink to={`/game/${game.id}/solo`}>Play solo</ButtonLink>
        </div>

        <h2 className="mb-3 text-xl font-semibold">
          {game.boards.length} round{game.boards.length === 1 ? "" : "s"}
        </h2>
        <ol className="flex flex-col gap-5">
          {game.boards.map((board, boardIndex) => (
            <li key={boardIndex}>
              <h3 className="mb-2 font-semibold">Round {boardIndex + 1}</h3>
              <ul className="flex flex-wrap gap-2">
                {board.categoryNames.map((categoryName, categoryIndex) => (
                  <li
                    key={`${categoryName}-${categoryIndex}`}
                    className="rounded-md bg-slate-100 px-3 py-1 text-sm"
                  >
                    {categoryName}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {game.copyright ? (
          <p className="mt-8 text-sm text-slate-500">{game.copyright}</p>
        ) : null}
      </Main>
    </div>
  );
}
