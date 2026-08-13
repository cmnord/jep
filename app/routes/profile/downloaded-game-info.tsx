import * as React from "react";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import * as DropdownMenu from "~/components/dropdown-menu";
import { ExclamationTriangle, Trash } from "~/components/icons";
import StyledLink from "~/components/link";
import type { CachedGame } from "~/utils/offline-storage";
import {
  deleteCachedGame,
  deleteSavedSoloState,
} from "~/utils/offline-storage";

const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function RemoveDownloadModal({
  isOpen,
  onClickClose,
  onConfirm,
  gameTitle,
}: {
  isOpen: boolean;
  onClickClose: () => void;
  onConfirm: () => void;
  gameTitle: string;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title={
        <div className="flex items-center gap-4">
          <ExclamationTriangle title="Warning" className="h-8 w-8" />
          <p>Remove download</p>
        </div>
      }
      onClose={onClickClose}
      description={`Remove the offline download for "${gameTitle}"? You won't be able to play this game offline until you download it again.`}
    >
      <Dialog.Footer>
        <Button onClick={onClickClose} type="button">
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} type="button">
          Remove download
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export function DownloadedGameInfo({
  cachedGame,
  onRemoved,
}: {
  cachedGame: CachedGame;
  onRemoved: () => void;
}) {
  const [showModal, setShowModal] = React.useState(false);
  const cachedAt = formatter.format(new Date(cachedGame.cachedAt));

  async function handleRemove() {
    setShowModal(false);
    await deleteCachedGame(cachedGame.id);
    await deleteSavedSoloState(cachedGame.id);
    onRemoved();
  }

  return (
    <li>
      <StyledLink to={`/game/${cachedGame.id}/solo`}>
        {cachedGame.title}
      </StyledLink>{" "}
      by {cachedGame.author}{" "}
      <span className="text-sm text-slate-500">{cachedAt}</span>
      <RemoveDownloadModal
        isOpen={showModal}
        onClickClose={() => setShowModal(false)}
        onConfirm={handleRemove}
        gameTitle={cachedGame.title}
      />
      <div className="ml-2 inline-flex items-center gap-1 align-middle">
        <DropdownMenu.Root>
          <DropdownMenu.MoreActionsTrigger />
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                asChild
                onSelect={(e: Event) => e.preventDefault()}
              >
                <DropdownMenu.Action onClick={() => setShowModal(true)}>
                  <Trash className="absolute left-0 m-1 h-5 w-5 text-red-600 group-hover:text-red-700" />
                  <p className="pl-7">Remove download</p>
                </DropdownMenu.Action>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
