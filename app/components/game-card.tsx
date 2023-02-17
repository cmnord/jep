import { Link } from "@remix-run/react";

import { Game } from "~/models/game.server";

export default function GameCard({ game }: { game: Game }) {
  const numRounds = game.boards.length;
  return (
    <button
      className={
        "basis-full sm:basis-auto " +
        "border-gray-200 border-2 rounded-lg group transition-colors " +
        "hover:border-blue-500 hover:shadow-sm "
      }
    >
      <Link to={`/${game.id}/play`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start p-4">
            <div className="flex gap-2 mb-2">
              <strong className="shrink-0">{game.title}</strong>
              <div className="flex py-0.5">
                <div className="border-l border-gray-200" />
              </div>
              <p className="text-sm text-gray-500 flex items-center shrink-0">
                {numRounds} {numRounds > 1 ? "rounds" : "round"}
              </p>
            </div>
            <p className="text-sm">by {game.author}</p>
          </div>
          <div className="flex items-center justify-center p-1 mr-2 rounded-full transition-colors group-hover:bg-blue-200">
            {/* Heroicon name: outline/chevron-right */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-blue-500 group-hover:text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
        </div>
      </Link>
    </button>
  );
}
