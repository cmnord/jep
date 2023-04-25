import { Link } from "@remix-run/react";
import * as React from "react";

import { LoadingSpinner } from "~/components/icons";
import type { Game } from "~/models/game.server";

/** Heroicon name: outline/chevron-right */
function ChevronRightIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={"h-6 w-6 " + className}
      role="img"
      aria-labelledby="start-title"
    >
      <title id="start-title">Play game</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

export default function GameCard({
  game,
  solo,
}: {
  game: Game;
  solo: boolean;
}) {
  const numRounds = game.boards.length;

  const [loading, setLoading] = React.useState(false);
  const to = solo ? `/game/${game.id}/solo` : `/game/${game.id}/play`;

  return (
    <button
      onClick={() => setLoading(true)}
      className={`group flex basis-full flex-col rounded-lg border-2
      border-slate-200 transition-colors
      hover:border-blue-500 hover:shadow-sm
      sm:basis-auto`}
    >
      <Link to={to} className="w-full grow">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2 p-4">
            <div className="flex w-full gap-2">
              <p
                className="min-w-0 overflow-hidden overflow-ellipsis whitespace-nowrap text-sm"
                title={game.author}
              >
                {game.author}
              </p>
              <div className="flex py-0.5">
                <div className="border-l border-slate-200" />
              </div>
              <p className="flex shrink-0 items-center text-sm text-slate-500">
                {numRounds} {numRounds === 1 ? "round" : "rounds"} (
                {game.boards
                  .map(
                    (b) =>
                      `${b.categories.length}x${b.categories[0].clues.length}`
                  )
                  .join(", ")}
                )
              </p>
            </div>
            <strong className="text-left" title={game.title}>
              {game.title}
            </strong>
            {game.note && (
              <p className="break-word text-left text-sm text-slate-500">
                {game.note}
              </p>
            )}
          </div>
          <div
            className={`mr-2 flex items-center justify-center rounded-full p-1
            text-blue-500 transition-colors
            group-hover:bg-blue-200`}
          >
            {loading ? (
              <LoadingSpinner className="group-hover:text-blue-600" />
            ) : (
              <ChevronRightIcon className="group-hover:text-blue-600" />
            )}
          </div>
        </div>
      </Link>
    </button>
  );
}
