import * as React from "react";
import type { FetcherWithComponents } from "react-router";
import { Link } from "react-router";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import Dialog from "~/components/dialog";
import * as DropdownMenu from "~/components/dropdown-menu";
import GameVisibilityIcon, {
  GameVisibilityTag,
} from "~/components/game-visibility-icon";
import {
  ArrowDownTray,
  EllipsisHorizontal,
  ExclamationTriangle,
  Trash,
} from "~/components/icons";
import StyledLink from "~/components/link";
import type { DbGame, GameVisibility } from "~/models/game.server";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

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
              <EllipsisHorizontal className="h-6 w-6" />
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
                  <ArrowDownTray className="absolute left-0 m-1 h-5 w-5" />
                  <p className="pl-7">Download JSON file</p>
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                asChild
                // Prevent the dropdown menu from closing
                onSelect={(e: Event) => e.preventDefault()}
              >
                <button onClick={() => setShowModal(true)} className="w-full">
                  <Trash className="absolute left-0 m-1 h-5 w-5 text-red-600 group-hover:text-red-700" />
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
