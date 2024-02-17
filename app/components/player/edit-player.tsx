import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import { LoadingSpinner } from "~/components/icons";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import useDebounce, { useDebounceEnd } from "~/utils/use-debounce";
import useSoloAction from "~/utils/use-solo-action";
import { PlayerScoreBox } from "./player";

/** Heroicon name: solid/paper-airplane */
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 opacity-50"
      role="img"
      aria-labelledby="send-title"
    >
      <title id="send-title">Send</title>
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

/* Heroicon name: solid/pencil-square */
function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 opacity-50"
      role="img"
      aria-labelledby="pencil-title"
    >
      <title id="pencil-title">Edit name</title>
      <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
      <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
    </svg>
  );
}

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
            <SendIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFocus}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <PencilIcon />
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
