import * as React from "react";
import { Link } from "react-router";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import * as DropdownMenu from "~/components/dropdown-menu";
import {
  ArrowDownTray,
  EllipsisHorizontal,
  ExclamationTriangle,
  LoadingSpinner,
  Play,
  Trash,
} from "~/components/icons";
import type { DbGame } from "~/models/game.server";

export type DownloadStatus = "none" | "downloading" | "downloaded";

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
      onClickClose={onClickClose}
      description={`Remove the offline download for "${gameTitle}"? You won't be able to play this game offline until you download it again.`}
    >
      <Dialog.Footer>
        <Button onClick={onClickClose} htmlType="button">
          Cancel
        </Button>
        <Button type="danger" onClick={onConfirm} htmlType="button">
          Remove download
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export default function OfflineMenu({
  game,
  downloadStatus,
  onDownload,
  onRemove,
}: {
  game: DbGame;
  downloadStatus: DownloadStatus;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const [showRemoveModal, setShowRemoveModal] = React.useState(false);

  return (
    <>
      <RemoveDownloadModal
        isOpen={showRemoveModal}
        onClickClose={() => setShowRemoveModal(false)}
        onConfirm={() => {
          setShowRemoveModal(false);
          onRemove();
        }}
        gameTitle={game.title}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="More actions"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            {downloadStatus === "downloaded" ? (
              <>
                <DropdownMenu.Item asChild>
                  <Link
                    to={`/game/${game.id}/solo`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Play className="absolute left-0 m-1 h-5 w-5" />
                    <p className="pl-7">Play offline</p>
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  asChild
                  onSelect={(e: Event) => e.preventDefault()}
                >
                  <button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemoveModal(true);
                    }}
                  >
                    <Trash className="absolute left-0 m-1 h-5 w-5 text-red-600 group-hover:text-red-700" />
                    <p className="pl-7">Remove download</p>
                  </button>
                </DropdownMenu.Item>
              </>
            ) : (
              <DropdownMenu.Item
                asChild
                onSelect={(e: Event) => e.preventDefault()}
              >
                <button
                  className="flex w-full items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                  disabled={downloadStatus === "downloading"}
                >
                  {downloadStatus === "downloading" ? (
                    <LoadingSpinner className="absolute left-0 m-1 text-white" />
                  ) : (
                    <ArrowDownTray className="absolute left-0 m-1 h-5 w-5" />
                  )}
                  <p className="pl-7">Download for offline</p>
                </button>
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
