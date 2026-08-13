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
  ExclamationTriangle,
  Eye,
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
        <DropdownMenu.Action>
          <GameVisibilityIcon variant="menu" visibility={visibility} />
          <p className="pl-7">Make {visibilityStr}</p>
        </DropdownMenu.Action>
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
      onClose={onClickClose}
      description={`Are you sure you want to delete game "${game.title}"? This action cannot be undone.`}
    >
      <fetcher.Form method="DELETE" action={`/game/${game.id}`}>
        <Dialog.Footer>
          <Button autoFocus onClick={onClickClose} type="button">
            Cancel
          </Button>
          <Button variant="danger" type="submit">
            Delete game
          </Button>
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
          <DropdownMenu.MoreActionsTrigger />
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Item asChild>
                <Link to={`/game/${game.id}`}>
                  <Eye className="absolute left-0 m-1 h-5 w-5" />
                  <p className="pl-7">Game details</p>
                </Link>
              </DropdownMenu.Item>
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
                <Link to={`/game/${game.id}/json`} reloadDocument>
                  <ArrowDownTray className="absolute left-0 m-1 h-5 w-5" />
                  <p className="pl-7">Download JSON file</p>
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                asChild
                // Prevent the dropdown menu from closing
                onSelect={(e: Event) => e.preventDefault()}
              >
                <DropdownMenu.Action onClick={() => setShowModal(true)}>
                  <Trash className="absolute left-0 m-1 h-5 w-5 text-red-600 group-hover:text-red-700" />
                  <p className="pl-7">Delete game</p>
                </DropdownMenu.Action>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
