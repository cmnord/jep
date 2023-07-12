import { Link } from "@remix-run/react";
import * as React from "react";

import { GameVisibilityTag } from "~/components/game-visibility-icon";
import { LoadingSpinner } from "~/components/icons";
import type { DbGame } from "~/models/game.server";

export default function GameCard({ game }: { game: DbGame }) {
  const [loading, setLoading] = React.useState(false);
  const to = `/game/${game.id}/play`;

  return (
    <button
      onClick={() => setLoading(true)}
      className={`group flex basis-full flex-col rounded-lg border
      border-slate-300 shadow-sm transition-colors hover:border-blue-500
      hover:shadow-sm sm:basis-auto`}
      disabled={loading}
    >
      <Link to={to} className="w-full grow">
        <div className="flex h-full min-w-0 grow flex-col items-start gap-2 p-4">
          <strong className="text-left text-lg" title={game.title}>
            {game.title}
          </strong>
          <p
            className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-left text-sm"
            title={game.author}
          >
            {game.author}
          </p>
          {game.note && (
            <p className="break-word text-left text-sm text-slate-500">
              {game.note}
            </p>
          )}
          <div className="mt-auto flex w-full justify-end gap-2">
            {loading ? <LoadingSpinner className="text-blue-500" /> : null}
            {game.visibility !== "PUBLIC" && (
              <GameVisibilityTag visibility={game.visibility} />
            )}
          </div>
        </div>
      </Link>
    </button>
  );
}
