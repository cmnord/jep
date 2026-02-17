import * as React from "react";
import { Link } from "react-router";

import { GameVisibilityTag } from "~/components/game-visibility-icon";
import { ArrowDownTray, LoadingSpinner } from "~/components/icons";
import SolveIcon from "~/components/solve-icon";
import type { DbGame } from "~/models/game.server";
import { Solve } from "~/models/solves.server";
import {
  cacheGame,
  deleteCachedGame,
  deleteSavedSoloState,
  getCachedGame,
} from "~/utils/offline-storage";

import OfflineMenu, { type DownloadStatus } from "./offline-menu";

export default function GameCard({
  game,
  solve,
  loggedIn,
}: {
  game: DbGame;
  solve?: Solve;
  loggedIn?: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const solved = solve?.solved_at !== null;
  const to =
    solve && !solve.solved_at
      ? `/room/${solve.room_id}-${solve.rooms?.name}`
      : `/game/${game.id}/play`;

  const [downloadStatus, setDownloadStatus] =
    React.useState<DownloadStatus>("none");

  React.useEffect(() => {
    getCachedGame(game.id)
      .then((cached) => {
        if (cached) setDownloadStatus("downloaded");
      })
      .catch(() => {});
  }, [game.id]);

  async function handleDownload() {
    setDownloadStatus("downloading");
    try {
      const resp = await fetch(`/game/${game.id}`);
      if (!resp.ok) throw new Error("fetch failed");
      const gameData = await resp.json();
      await cacheGame({
        id: game.id,
        game: gameData,
        title: game.title,
        author: game.author,
        cachedAt: Date.now(),
      });
      setDownloadStatus("downloaded");
    } catch {
      setDownloadStatus("none");
    }
  }

  async function handleRemove() {
    await deleteCachedGame(game.id);
    await deleteSavedSoloState(game.id);
    setDownloadStatus("none");
  }

  return (
    <div className="group flex w-full basis-full flex-col rounded-lg border border-slate-300 shadow-sm transition-colors hover:border-blue-500 hover:shadow-sm sm:basis-auto">
      <Link to={to} className="w-full grow" onClick={() => setLoading(true)}>
        <div className="flex h-full min-w-0 grow flex-col items-start gap-2 p-4">
          <div className="flex w-full justify-between">
            <strong className="text-left text-lg" title={game.title}>
              {game.title}
            </strong>
            <div className="flex items-center gap-1">
              {solve ? <SolveIcon solved={solved} /> : null}
              {loggedIn && (
                <OfflineMenu
                  game={game}
                  downloadStatus={downloadStatus}
                  onDownload={handleDownload}
                  onRemove={handleRemove}
                />
              )}
            </div>
          </div>
          <p
            className="w-full overflow-hidden text-left text-sm overflow-ellipsis whitespace-nowrap"
            title={game.author}
          >
            {game.author}
          </p>
          {game.note && (
            <p className="text-left text-sm break-word text-slate-500">
              {game.note}
            </p>
          )}
          <div className="mt-auto flex w-full items-center justify-end gap-2">
            {loading ? <LoadingSpinner className="text-blue-500" /> : null}
            {downloadStatus === "downloaded" && (
              <ArrowDownTray
                className="h-4 w-4 text-slate-400"
                title="Downloaded for offline play"
              />
            )}
            {game.visibility !== "PUBLIC" && (
              <GameVisibilityTag visibility={game.visibility} />
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
