import { useFetcher } from "react-router";
import * as React from "react";

import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import useSoloAction from "~/utils/use-solo-action";
import { PlayerScoreBox } from "./player";

function KickPlayer({
  hasBoardControl,
  player,
  winning = false,
}: {
  hasBoardControl: boolean;
  player: Player;
  winning?: boolean;
}) {
  return (
    <PlayerScoreBox player={player} hasBoardControl={hasBoardControl} winning={winning}>
      <div className="flex w-full items-center gap-2 text-2xl">
        <p className="font-handwriting font-bold text-slate-300">
          {player.name}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="submit"
            className="flex grow items-center rounded-md
            p-1
        text-slate-300
        transition-colors hover:bg-slate-800
        hover:text-white focus:bg-slate-800 focus:text-white"
          >
            {/* Heroicon name: solid/x-mark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
          {winning && "👑"}
        </div>
      </div>
    </PlayerScoreBox>
  );
}

export function KickPlayerForm({
  roomId,
  player,
  winning = false,
}: {
  roomId: number;
  player: Player;
  winning?: boolean;
}) {
  const { soloDispatch, boardControl } = useEngineContext();

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const formRef = React.useRef<HTMLFormElement | null>(null);

  return (
    <fetcher.Form
      method="DELETE"
      action={`/room/${roomId}/player`}
      ref={formRef}
    >
      <input type="hidden" name="userId" value={player.userId} />
      <input type="hidden" name="name" value={player.name} />
      <KickPlayer
        player={player}
        hasBoardControl={player.userId === boardControl}
        winning={winning}
      />
    </fetcher.Form>
  );
}
