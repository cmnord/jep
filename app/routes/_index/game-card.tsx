import { Link } from "@remix-run/react";
import * as React from "react";

import { GameVisibilityTag } from "~/components/game-visibility-icon";
import { LoadingSpinner } from "~/components/icons";
import SolveIcon from "~/components/solve-icon";
import type { DbGame } from "~/models/game.server";
import { Solve } from "~/models/solves.server";

export default function GameCard({
  game,
  solve,
}: {
  game: DbGame;
  solve?: Solve;
}) {
  const [loading, setLoading] = React.useState(false);
  const solved = solve?.solved_at !== null;
  const to =
    solve && !solve.solved_at
      ? `/room/${solve.room_id}-${solve.rooms?.name}`
      : `/game/${game.id}/play`;

  return (
    <button
      onClick={() => setLoading(true)}
      className={`group flex basis-full flex-col rounded-lg border border-slate-300 shadow-sm transition-colors hover:border-blue-500 hover:shadow-sm sm:basis-auto`}
      disabled={loading}
    >
      <Link to={to} className="w-full grow">
        <div className="flex h-full min-w-0 grow flex-col items-start gap-2 p-4">
          <div className="flex w-full justify-between">
            <strong className="text-left text-lg" title={game.title}>
              {game.title}
            </strong>
            {solve ? (
              <div>
                <SolveIcon solved={solved} />
              </div>
            ) : null}
          </div>
          <p
            className="w-full overflow-hidden text-left text-sm overflow-ellipsis whitespace-nowrap"
            title={game.author}
          >
            {game.author}
          </p>
          {game.note && (
            <p className="text-left text-sm break-word text-slate-500">
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
