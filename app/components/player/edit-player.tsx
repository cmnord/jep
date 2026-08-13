import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import {
  LoadingSpinner,
  PaperAirplane,
  PencilSquare,
} from "~/components/icons";
import Input from "~/components/input";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import useDebounce, { useDebounceEnd } from "~/utils/use-debounce";
import useSoloAction from "~/utils/use-solo-action";

import { PlayerScoreBox, ScorePulse } from "./player";

function EditPlayer({
  hasBoardControl,
  loading,
  player,
  editing,
  onBlur,
  onChangeName,
  onFocus,
  winning,
  icon,
  scorePopover,
  scorePopoverKey,
  scorePopoverAutoOpen,
  pulse,
}: {
  hasBoardControl: boolean;
  loading: boolean;
  player: Player;
  editing: boolean;
  onBlur: () => void;
  onChangeName: (name: string) => void;
  onFocus: () => void;
  winning: boolean;
  icon?: React.ReactNode;
  scorePopover?: React.ReactNode;
  scorePopoverKey?: boolean;
  scorePopoverAutoOpen?: boolean;
  pulse?: ScorePulse;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debouncedLoading = useDebounceEnd(loading, 100);

  function handleFocus() {
    inputRef.current?.focus();
    onFocus();
  }

  return (
    <PlayerScoreBox
      player={player}
      hasBoardControl={hasBoardControl}
      winning={winning}
      icon={icon}
      scorePopover={scorePopover}
      scorePopoverKey={scorePopoverKey}
      scorePopoverAutoOpen={scorePopoverAutoOpen}
      pulse={pulse}
    >
      <div className="flex items-center gap-2 rounded-xl text-white">
        <Input
          variant="player"
          ref={inputRef}
          type="text"
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={player.name}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={onBlur}
          onFocus={handleFocus}
        />
        {debouncedLoading ? (
          <LoadingSpinner className="px-3 py-2 text-blue-600" />
        ) : editing ? (
          <button
            type="button"
            onClick={onBlur}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <PaperAirplane className="h-5 w-5 opacity-50" title="Submit" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFocus}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <PencilSquare className="h-5 w-5 opacity-50" title="Edit" />
          </button>
        )}
      </div>
    </PlayerScoreBox>
  );
}

export function EditPlayerForm({
  roomId,
  userId,
  winning,
  icon,
  scorePopover,
  scorePopoverKey,
  scorePopoverAutoOpen,
  pulse,
}: {
  winning: boolean;
  icon?: React.ReactNode;
  scorePopover?: React.ReactNode;
  scorePopoverKey?: boolean;
  scorePopoverAutoOpen?: boolean;
  pulse?: ScorePulse;
} & RoomProps) {
  const { players, soloDispatch, boardControl } = useEngineContext();

  const fetcher = useFetcher<Action>();
  const loading = fetcher.state === "loading";
  useSoloAction(fetcher, soloDispatch);

  const [editing, setEditing] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [optimisticPlayer, setOptimisticPlayer] = React.useState(
    players.get(userId),
  );

  const [name, setName] = React.useState(optimisticPlayer?.name);
  const debouncedName = useDebounce(name, 500);

  React.useEffect(() => {
    const serverPlayer = players.get(userId);
    setOptimisticPlayer(serverPlayer);
    setName(serverPlayer?.name);
  }, [players, userId]);

  React.useEffect(() => {
    if (
      !editing &&
      debouncedName !== optimisticPlayer?.name &&
      debouncedName &&
      fetcher.state === "idle"
    ) {
      fetcher.submit(formRef.current, { method: "PATCH" });
      setOptimisticPlayer((prev) =>
        prev
          ? { ...prev, name: debouncedName }
          : { userId, name: debouncedName, score: 0 },
      );
    }
  }, [editing, debouncedName, optimisticPlayer, userId, fetcher]);

  if (!optimisticPlayer) {
    return null;
  }

  return (
    <fetcher.Form
      method="PATCH"
      action={`/room/${roomId}/player`}
      ref={formRef}
    >
      <input
        type="hidden"
        name="userId"
        aria-describedby="upload_help"
        value={userId}
      />
      <EditPlayer
        player={optimisticPlayer}
        hasBoardControl={userId === boardControl}
        loading={loading}
        editing={editing}
        onBlur={() => setEditing(false)}
        onChangeName={setName}
        onFocus={() => setEditing(true)}
        winning={winning}
        icon={icon}
        scorePopover={scorePopover}
        scorePopoverKey={scorePopoverKey}
        scorePopoverAutoOpen={scorePopoverAutoOpen}
        pulse={pulse}
      />
    </fetcher.Form>
  );
}
