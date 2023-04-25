import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { FetcherWithComponents } from "@remix-run/react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import Link from "~/components/link";

import * as DropdownMenu from "~/components/dropdown-menu";
import { Eye, EyeSlash } from "~/components/icons";
import { requireAuthSession } from "~/models/auth";
import type { DbGame, GameVisibility } from "~/models/game.server";
import { getGamesForUser } from "~/models/game.server";
import { getUserByEmail } from "~/models/user/service.server";
import { BASE_URL } from "~/utils";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function EllipsisIcon() {
  return (
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
        d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

export async function loader({ request }: LoaderArgs) {
  const authSession = await requireAuthSession(request);

  if (!authSession) {
    throw redirect("/login");
  }

  const games = await getGamesForUser(
    authSession.userId,
    authSession.accessToken
  );

  const user = await getUserByEmail(authSession.email, authSession.accessToken);
  return json({ user, games, env: { BASE_URL } });
}

function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-md p-1 text-slate-700
      hover:bg-slate-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      onClick={() => navigator.clipboard.writeText(url)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
        role="img"
        aria-labelledby="copy-title"
      >
        <title id="copy-title">Copy link</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
    </button>
  );
}

function VisibilityIcon({
  className,
  visibility,
}: {
  className: string;
  visibility: GameVisibility;
}) {
  switch (visibility) {
    case "PUBLIC":
      return (
        <Eye
          className={"text-green-600 group-hover:text-green-700 " + className}
          title="Public"
        />
      );
    case "PRIVATE":
      return <EyeSlash className={className} title="Private" />;
    case "UNLISTED":
      return <Eye className={className} title="Unlisted" />;
  }
}

function ChangeVisibilityItem({
  fetcher,
  gameId,
  visibility,
}: {
  fetcher: FetcherWithComponents<any>;
  gameId: string;
  visibility: GameVisibility;
}) {
  const visibilityStr = visibility.toLocaleLowerCase();
  return (
    <DropdownMenu.Item
      asChild
      // Prevent the dropdown menu from closing
      onSelect={(e) => e.preventDefault()}
    >
      <fetcher.Form method="PATCH" action={`/game/${gameId}`}>
        <input type="hidden" readOnly name="visibility" value={visibility} />
        <button className="flex grow items-center">
          <VisibilityIcon
            className="absolute left-0 m-1 h-5 w-5"
            visibility={visibility}
          />
          <p className="pl-7">Make {visibilityStr}</p>
        </button>
      </fetcher.Form>
    </DropdownMenu.Item>
  );
}

function GameInfo({ BASE_URL, game }: { BASE_URL: string; game: DbGame }) {
  const url = BASE_URL + "/game/" + game.id + "/play";
  const createdAt = formatter.format(new Date(game.created_at));
  const fetcher = useFetcher();

  return (
    <li>
      <Link to={`/game/${game.id}/play`}>{game.title}</Link> by {game.author}{" "}
      <span className="text-sm text-slate-500">{createdAt}</span>
      <div className="ml-2 inline-flex items-center gap-1">
        <div
          className={`flex items-center rounded-md border border-slate-200
          bg-slate-100 px-1 text-slate-500`}
        >
          <span className="text-xs">{game.visibility}</span>
          <VisibilityIcon
            className="m-1 inline-block h-3 w-3"
            visibility={game.visibility}
          />
        </div>
        <CopyLinkButton url={url} />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="inline-flex rounded-md p-1 hover:bg-slate-200"
              title="More actions"
            >
              <EllipsisIcon />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              {game.visibility === "PUBLIC" ? null : (
                <ChangeVisibilityItem
                  gameId={game.id}
                  visibility="PUBLIC"
                  fetcher={fetcher}
                />
              )}
              {game.visibility === "UNLISTED" ? null : (
                <ChangeVisibilityItem
                  gameId={game.id}
                  visibility="UNLISTED"
                  fetcher={fetcher}
                />
              )}
              {game.visibility === "PRIVATE" ? null : (
                <ChangeVisibilityItem
                  gameId={game.id}
                  visibility="PRIVATE"
                  fetcher={fetcher}
                />
              )}
              <DropdownMenu.Item
                asChild
                // Prevent the dropdown menu from closing
                onSelect={(e) => e.preventDefault()}
              >
                <fetcher.Form method="DELETE" action={`/game/${game.id}`}>
                  <button className="flex grow items-center">
                    {/* Heroicon name: solid/trash */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="absolute left-0 m-1 h-5 w-5 text-red-600 group-hover:text-red-700"
                      role="img"
                      aria-labelledby="trash-title"
                    >
                      <title id="trash-title">Delete game</title>
                      <path
                        fillRule="evenodd"
                        d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="pl-7">Delete game</p>
                  </button>
                </fetcher.Form>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}

export default function Profile() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Profile</h2>
        <p className="mb-4">{data.user?.email}</p>
        <h2 className="mb-4 text-2xl font-semibold">My Games</h2>
        <ul className="list-inside list-disc text-slate-700">
          {data.games.map((game) => (
            <GameInfo key={game.id} BASE_URL={data.env.BASE_URL} game={game} />
          ))}
        </ul>
      </main>
    </div>
  );
}
