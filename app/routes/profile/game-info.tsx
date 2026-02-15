import type { FetcherWithComponents } from "@remix-run/react";
import { Link } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import Dialog from "~/components/dialog";
import * as DropdownMenu from "~/components/dropdown-menu";
import GameVisibilityIcon, {
  GameVisibilityTag,
} from "~/components/game-visibility-icon";
import { ExclamationTriangle } from "~/components/icons";
import StyledLink from "~/components/link";
import type { DbGame, GameVisibility } from "~/models/game.server";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** Heroicon name: solid/ellipsis-horizontal */
function EllipsisIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      role="img"
      aria-labelledby="more-actions-title"
    >
      <title id="more-actions-title">More actions</title>
      <path
        fillRule="evenodd"
        d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChangeVisibilityItem({
  fetcher,
  gameId,
  visibility,
}: {
  fetcher: FetcherWithComponents<never>;
  gameId: string;
  visibility: GameVisibility;
}) {
  const visibilityStr = visibility.toLocaleLowerCase();
  return (
    <DropdownMenu.Item
      asChild
      // Prevent the dropdown menu from closing
      onSelect={(e: Event) => e.preventDefault()}
    >
      <fetcher.Form method="PATCH" action={`/game/${gameId}`}>
        <input type="hidden" readOnly name="visibility" value={visibility} />
        <button className="flex grow items-center">
          <GameVisibilityIcon
            className="absolute left-0 m-1 h-5 w-5"
            visibility={visibility}
          />
          <p className="pl-7">Make {visibilityStr}</p>
        </button>
      </fetcher.Form>
    </DropdownMenu.Item>
  );
}

function DeleteGameModal({
  fetcher,
  isOpen,
  onClickClose,
  game,
}: {
  fetcher: FetcherWithComponents<never>;
  isOpen: boolean;
  onClickClose: () => void;
  game: DbGame;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title={
        <div className="flex items-center gap-4">
          <ExclamationTriangle title="Warning" className="h-8 w-8" />
          <p>Delete game</p>
        </div>
      }
      onClickClose={onClickClose}
      description={`Are you sure you want to delete game "${game.title}"? This action cannot be undone.`}
    >
      <fetcher.Form method="DELETE" action={`/game/${game.id}`}>
        <Dialog.Footer>
          <Button autoFocus onClick={onClickClose} htmlType="button">
            Cancel
          </Button>
          <Button type="danger">Delete game</Button>
        </Dialog.Footer>
      </fetcher.Form>
    </Dialog>
  );
}

export function GameInfo({
  BASE_URL,
  game,
  fetcher,
}: {
  BASE_URL: string;
  game: DbGame;
  fetcher: FetcherWithComponents<never>;
}) {
  const url = BASE_URL + "/game/" + game.id + "/play";
  const createdAt = formatter.format(new Date(game.created_at));

  const [showModal, setShowModal] = React.useState(false);

  return (
    <li>
      <StyledLink to={`/game/${game.id}/play`}>{game.title}</StyledLink> by{" "}
      {game.author} <span className="text-sm text-slate-500">{createdAt}</span>
      <DeleteGameModal
        isOpen={showModal}
        fetcher={fetcher}
        onClickClose={() => setShowModal(false)}
        game={game}
      />
      <div className="ml-2 inline-flex items-center gap-1">
        <GameVisibilityTag visibility={game.visibility} />
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
              <DropdownMenu.Item asChild>
                <Link to={"/game/" + game.id} reloadDocument>
                  {/* Heroicon name: solid/arrow-down-tray */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="absolute left-0 m-1 h-5 w-5"
                    role="img"
                    aria-labelledby="download-title"
                  >
                    <title id="download-title">Download</title>
                    <path
                      fillRule="evenodd"
                      d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="pl-7">Download JSON file</p>
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                asChild
                // Prevent the dropdown menu from closing
                onSelect={(e: Event) => e.preventDefault()}
              >
                <button onClick={() => setShowModal(true)} className="w-full">
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
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
