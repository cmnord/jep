import { Link, useMatches } from "react-router";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import * as DropdownMenu from "~/components/dropdown-menu";
import SoundControl from "~/components/sound";
import WagerHintsControl from "~/components/wager-hints-control";
import type { Game } from "~/models/game.server";

function isGameLoaderData(data: unknown): data is { game: Game } {
  return typeof data === "object" && data !== null && "game" in data;
}
import { stringToHslColor } from "~/utils";
import { useGameDefaults } from "~/utils/user-settings";

import { ExclamationTriangle, InformationCircle } from "./icons";

function LoginButton({ pathname }: { pathname: string }) {
  const to =
    pathname === "/"
      ? "/login"
      : `/login?redirectTo=${encodeURIComponent(pathname)}`;
  return (
    <Link to={to}>
      <Button type="transparent">Log in</Button>
    </Link>
  );
}

function AccountButton({ user }: { user: { id: string; email: string } }) {
  const { playerColor } = useGameDefaults();
  const backgroundColor =
    playerColor != null ? playerColor : stringToHslColor(user.id);
  return (
    <Link
      to="/profile"
      className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-blue-700"
      style={{ backgroundColor }}
      aria-label="Profile"
    >
      <div className="flex h-6 w-6 items-center justify-center text-blue-1000 uppercase">
        {user.email.slice(0, 1)}
      </div>
    </Link>
  );
}

function GameSettings({ game, url }: { game: Game; url: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex h-6 w-6 items-center justify-center text-white hover:text-slate-300 data-[state=open]:text-slate-300`}
          aria-label="Customise options"
        >
          <InformationCircle className="h-6 w-6" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Label className="p-1 font-bold">
            {game.title}
          </DropdownMenu.Label>
          <DropdownMenu.Label className="p-1 text-slate-400">
            {game.author} &middot; {game.copyright}
          </DropdownMenu.Label>
          {game.note && (
            <DropdownMenu.Label>
              <p className="p-1 text-sm break-words">{game.note}</p>
            </DropdownMenu.Label>
          )}
          <DropdownMenu.Label className="p-1 text-sm text-slate-400">
            {game.boards.length} round{game.boards.length === 1 ? "" : "s"}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="m-1 h-px bg-slate-200" />

          <DropdownMenu.Item
            className="relative flex items-center rounded-md p-1"
            // Prevent the dropdown menu from closing
            onSelect={(e: Event) => e.preventDefault()}
          >
            <div className="w-full">
              <SoundControl />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="relative flex items-center rounded-md p-1"
            onSelect={(e: Event) => e.preventDefault()}
          >
            <div className="w-full">
              <WagerHintsControl />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            // Prevent the dropdown menu from closing
            onSelect={(e: Event) => e.preventDefault()}
          >
            <CopyLinkButton
              className="grow"
              url={url}
              text="Copy link to room"
            />
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <Link to={`/report?gameId=${game.id}`}>
              <ExclamationTriangle
                title="Report"
                className="absolute left-0 m-1 h-5 w-5"
              />
              <p className="pl-7">Report game</p>
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function Header({
  user,
  BASE_URL,
}: {
  user?: { id: string; email: string };
  BASE_URL?: string;
}) {
  const matches = useMatches();
  const gameRoute = matches.find((m) => isGameLoaderData(m.loaderData));
  const game =
    gameRoute && isGameLoaderData(gameRoute.loaderData)
      ? gameRoute.loaderData.game
      : undefined;
  const pathname = matches[matches.length - 1].pathname;

  return (
    <nav className="bg-blue-bright p-4">
      <div className="flex items-center justify-between">
        <Link to="/">
          <h1 className="font-korinna text-2xl font-bold text-white text-shadow-md">
            Jep!
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <AccountButton user={user} />
          ) : (
            <LoginButton pathname={pathname} />
          )}
          {game && <GameSettings game={game} url={BASE_URL + pathname} />}
        </div>
      </div>
    </nav>
  );
}
