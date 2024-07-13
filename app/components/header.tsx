import { Form, Link, useMatches } from "@remix-run/react";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import * as DropdownMenu from "~/components/dropdown-menu";
import SoundControl from "~/components/sound";
import type { Game } from "~/models/game.server";
import { stringToHslColor } from "~/utils";
import { ExclamationTriangle } from "./icons";

function LoginButton() {
  return (
    <Link to="/login">
      <Button type="transparent">Log in</Button>
    </Link>
  );
}

/** AccountButton shows an avatar for the user and a dropddown to their profile
 * and a logout button.
 */
function AccountButton({ user }: { user: { id: string; email: string } }) {
  const backgroundColor = stringToHslColor(user.id);
  const email = user.email;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex items-center justify-center rounded-full p-1
          transition-colors
          hover:bg-blue-700 data-[state=open]:bg-blue-700`}
          style={{ backgroundColor }}
          aria-label="Account"
        >
          <div className="flex h-6 w-6 items-center justify-center uppercase text-blue-1000">
            {email.slice(0, 1)}
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Label className="p-1 font-bold">
            {email}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="m-1 h-px bg-slate-200" />
          <DropdownMenu.Item asChild>
            <Link to="/profile">
              {/* Heroicon name: solid/user */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="absolute left-0 m-1 h-5 w-5"
                role="img"
                aria-labelledby="user-title"
              >
                <title id="user-title">Profile</title>
                <path
                  fillRule="evenodd"
                  d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="pl-7">Profile</p>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            asChild
            // Prevent the dropdown menu from closing
            onSelect={(e) => e.preventDefault()}
          >
            <Form method="POST" action="/logout">
              <button type="submit" className="flex grow items-center">
                {/* Heroicon name: solid/logout */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="absolute left-0 m-1 h-5 w-5"
                  role="img"
                  aria-labelledby="logout-title"
                >
                  <title id="logout-title">Log out</title>
                  <path
                    fillRule="evenodd"
                    d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm5.03 4.72a.75.75 0 010 1.06l-1.72 1.72h10.94a.75.75 0 010 1.5H10.81l1.72 1.72a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="pl-7">Log out</p>
              </button>
            </Form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function GameSettings({ game, url }: { game: Game; url: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex h-6 w-6 items-center justify-center text-white
          hover:text-slate-300 data-[state=open]:text-slate-300`}
          aria-label="Customise options"
        >
          {/* Heroicon name: outline/information-circle */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
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
              <p className="break-words p-1 text-sm">{game.note}</p>
            </DropdownMenu.Label>
          )}
          <DropdownMenu.Label className="p-1 text-sm text-slate-400">
            {game.boards.length} round{game.boards.length === 1 ? "" : "s"}
          </DropdownMenu.Label>

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
          <DropdownMenu.Item
            // Prevent the dropdown menu from closing
            onSelect={(e) => e.preventDefault()}
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
  const gameRoute = matches.find((match) => {
    const data = match.data;
    return data && typeof data === "object" && "game" in data;
  });
  const game =
    gameRoute &&
    typeof gameRoute.data === "object" &&
    gameRoute.data !== null &&
    "game" in gameRoute.data
      ? (gameRoute.data.game as Game)
      : undefined;
  const pathname = matches[matches.length - 1].pathname;

  return (
    <nav className="bg-blue-bright p-4">
      <div className="flex items-center justify-between">
        <Link to="/">
          <h1 className="text-shadow-md font-korinna text-2xl font-bold text-white">
            Jep!
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {user ? <AccountButton user={user} /> : <LoginButton />}
          {game && <GameSettings game={game} url={BASE_URL + pathname} />}
        </div>
      </div>
    </nav>
  );
}
