import { useFetcher } from "@remix-run/react";
import * as React from "react";

import classNames from "classnames";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useDebounce, useDebounceEnd } from "~/utils/use-debounce";
import { useSoloAction } from "~/utils/use-solo-action";
import LoadingSpinner from "../loading-spinner";

function SendIcon({ className }: { className?: string }) {
  // Heroicon name: solid/paper-airplane
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={"w-5 h-5 " + className}
      role="img"
      aria-labelledby="send-title"
    >
      <title id="send-title">Send</title>
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

function EditPlayer({
  boardControl,
  loading,
  name,
  onBlur,
  onChangeName,
  onFocus,
}: {
  boardControl?: string;
  loading: boolean;
  name: string;
  onBlur: () => void;
  onChangeName: (name: string) => void;
  onFocus: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debouncedLoading = useDebounceEnd(loading, 100);

  return (
    <div className="flex gap-2 items-center mb-4">
      <label htmlFor="name" className="text-gray-500 text-sm">
        You are:
      </label>
      <div
        className={classNames("relative shadow rounded-md", {
          "border-2 border-black": !boardControl,
          "border-4 border-yellow-400": boardControl,
        })}
      >
        <input
          ref={inputRef}
          type="text"
          id="name"
          name="name"
          className="p-2 bg-transparent rounded-md focus:ring-blue-500 focus:border-blue-500"
          defaultValue={name}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={onBlur}
          onFocus={() => {
            inputRef.current?.select();
            onFocus();
          }}
        />
        <div className={"absolute right-0 bottom-0.5 p-2"}>
          {debouncedLoading ? (
            <LoadingSpinner className="text-blue-600" />
          ) : (
            <SendIcon className="text-gray-300" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditPlayerForm({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { players, boardControl, soloDispatch } = useEngineContext();

  const fetcher = useFetcher<Action>();
  const loading = fetcher.state === "loading";
  useSoloAction(fetcher, soloDispatch);

  const [editing, setEditing] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [optimisticPlayer, setOptimisticPlayer] = React.useState(
    players.get(userId)
  );

  const [name, setName] = React.useState(optimisticPlayer?.name ?? "You");
  const debouncedName = useDebounce(name, 500);

  React.useEffect(() => {
    const serverPlayer = players.get(userId);
    setOptimisticPlayer(serverPlayer);
    setName(serverPlayer?.name ?? "You");
  }, [players, userId]);

  React.useEffect(() => {
    if (
      !editing &&
      debouncedName !== optimisticPlayer?.name &&
      debouncedName !== "" &&
      fetcher.state === "idle"
    ) {
      fetcher.submit(formRef.current);
      setOptimisticPlayer((prev) =>
        prev
          ? { ...prev, name: debouncedName, score: 0 }
          : { userId, name: debouncedName, score: 0 }
      );
    }
  }, [editing, debouncedName, optimisticPlayer, userId, fetcher]);

  return (
    <fetcher.Form
      method="post"
      action={`/room/${roomName}/player`}
      ref={formRef}
    >
      <input
        type="hidden"
        name="userId"
        aria-describedby="upload_help"
        value={userId}
      />
      <EditPlayer
        boardControl={boardControl}
        loading={loading}
        name={optimisticPlayer?.name ?? "You"}
        onBlur={() => setEditing(false)}
        onChangeName={setName}
        onFocus={() => setEditing(true)}
      />
    </fetcher.Form>
  );
}
