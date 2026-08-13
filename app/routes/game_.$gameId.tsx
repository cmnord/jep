import { redirect } from "react-router";
import { z } from "zod";

import { EmptyBoard } from "~/components/board/layout";
import { ButtonLink } from "~/components/button";
import { GameVisibilityTag } from "~/components/game-visibility-icon";
import { Play, User } from "~/components/icons";
import { getValidAuthSession } from "~/models/auth";
import {
  deleteGame,
  getGame,
  updateGameVisibility,
} from "~/models/game.server";
import type { GameVisibility } from "~/models/game.server";
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

  const clueCount = game.boards.reduce(
    (total, board) =>
      total +
      board.categories.reduce(
        (boardTotal, category) => boardTotal + category.clues.length,
        0,
      ),
    0,
  );
  const startingBoard = game.boards.at(0);
  const startingGrid = {
    columns: startingBoard?.categories.length ?? 0,
    rows: Math.max(
      0,
      ...(startingBoard?.categories.map((category) => category.clues.length) ??
        []),
    ),
  };

  // A preview must not serialize category names, clues, or answers to the
  // browser. Keep the full game behind the play and JSON routes.
  return {
    game: {
      id: game.id,
      author: game.author,
      title: game.title,
      copyright: game.copyright,
      note: game.note,
      visibility: game.visibility,
      roundCount: game.boards.length,
      clueCount,
      startingGrid,
    },
  };
}

type PreviewGame = {
  id: string;
  author: string;
  title: string;
  copyright: string;
  note: string;
  visibility: GameVisibility;
  roundCount: number;
  clueCount: number;
  startingGrid: { columns: number; rows: number };
};

function GameStat({ count, label }: { count: number; label: string }) {
  return (
    <span>
      {count} {label}
      {count === 1 ? "" : "s"}
    </span>
  );
}

function PlayLinks({ gameId }: { gameId: string }) {
  return (
    <div className="grid gap-3 sm:flex sm:flex-wrap">
      <ButtonLink to={`/game/${gameId}/play`} variant="primary">
        <Play className="h-4 w-4" />
        Play with friends
      </ButtonLink>
      <ButtonLink to={`/game/${gameId}/solo`} variant="inverse">
        <User className="h-4 w-4" />
        Play solo
      </ButtonLink>
    </div>
  );
}

function GameInvitation({ game }: { game: PreviewGame }) {
  return (
    <main className="flex grow flex-col bg-blue-1000 text-white">
      <EmptyBoard {...game.startingGrid} />

      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-5 p-3 text-slate-100 sm:p-6 md:p-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl">
              {game.title}
            </h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              By {game.author}
            </p>
          </div>
          {game.visibility !== "PUBLIC" ? (
            <GameVisibilityTag visibility={game.visibility} />
          ) : null}
        </div>

        {game.note ? (
          <p className="max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
            {game.note}
          </p>
        ) : null}

        <div className="flex gap-2 text-sm text-slate-300">
          <GameStat count={game.roundCount} label="round" />
          <span aria-hidden="true">&middot;</span>
          <GameStat count={game.clueCount} label="clue" />
        </div>

        <PlayLinks gameId={game.id} />

        {game.copyright ? (
          <p className="text-xs text-slate-400">{game.copyright}</p>
        ) : null}
      </div>
    </main>
  );
}

export default function GamePreview({ loaderData }: Route.ComponentProps) {
  const { game } = loaderData;
  return <GameInvitation game={game} />;
}
