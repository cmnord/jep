import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useMatches } from "@remix-run/react";

import Button from "~/components/button";
import SoundControl from "~/components/sound";
import type { Game } from "~/models/game.server";


function GameSettings({ game }: { game: Game }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex h-6 w-6 items-center justify-center text-white
          hover:text-slate-300 data-[state=open]:text-slate-300`}
          aria-label="Customise options"
        >
          {/* Heroicon name: outline/bars-3 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`w-56 rounded-md bg-white p-1 text-slate-900
          will-change-[opacity,transform]
          data-[side=bottom]:animate-slideUpAndFade
          data-[side=left]:animate-slideRightAndFade
          data-[side=right]:animate-slideLeftAndFade
          data-[side=top]:animate-slideDownAndFade`}
          sideOffset={5}
        >
          <DropdownMenu.Label className="p-1 font-bold">
            {game.title}
          </DropdownMenu.Label>
          <DropdownMenu.Label className="p-1">
            by {game.author}
          </DropdownMenu.Label>
          {game.note && (
            <DropdownMenu.Label>
              <p className="break-words p-1 text-sm">{game.note}</p>
            </DropdownMenu.Label>
          )}

          <DropdownMenu.Separator className="m-1 h-px bg-slate-200" />

          <DropdownMenu.Item
            className="relative flex items-center rounded-md p-1"
            // Prevent the dropdown menu from closing
            onSelect={(e) => e.preventDefault()}
          >
            <div className="w-full">
              <SoundControl />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Header() {
  const matches = useMatches();
  const gameRoute = matches.find((match) => match.data && "game" in match.data);
  const game = gameRoute ? (gameRoute.data.game as Game) : undefined;

  return (
    <nav className="bg-blue-1000 p-6">
      <div className="flex items-center justify-between">
        <Link to="/">
          <h1 className="text-shadow-md font-korinna text-2xl font-bold text-white">
            Jep!
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {game && <GameSettings game={game} />}
        </div>
      </div>
    </nav>
  );
}
