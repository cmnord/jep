import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import {
  LoadingSpinner,
  PaperAirplane,
  PencilSquare,
} from "~/components/icons";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import useDebounce, { useDebounceEnd } from "~/utils/use-debounce";
import useSoloAction from "~/utils/use-solo-action";

import { PlayerScoreBox } from "./player";

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
    >
      <div className="flex items-center gap-2 rounded-xl text-white">
        <input
          ref={inputRef}
          type="text"
          id="name"
          name="name"
          className={`placeholder:text-opacity-40 block w-full bg-transparent font-handwriting text-2xl font-bold placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-white`}
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
            <PaperAirplane className="h-5 w-5 opacity-50" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFocus}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <PencilSquare className="h-5 w-5 opacity-50" />
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
}: { winning: boolean; icon?: React.ReactNode } & RoomProps) {
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
      />
    </fetcher.Form>
  );
}
