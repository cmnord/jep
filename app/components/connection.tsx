import clsx from "clsx";
import * as React from "react";

import { ConnectionState } from "~/engine/use-game-engine";
import useDebounce from "~/utils/use-debounce";
import Popover from "./popover";

const DURATION_UPDATE_INTERVAL_MS = 500;

function formatConnectionState(state: ConnectionState) {
  switch (state) {
    case ConnectionState.ERROR:
      return "Connection error (please refresh the page)";
    case ConnectionState.CONNECTING:
      return "Connecting";
    case ConnectionState.CONNECTED:
      return "Connected";
    case ConnectionState.DISCONNECTING:
      return "Disconnecting";
    case ConnectionState.DISCONNECTED:
      return "Disconnected";
    default:
      throw new Error(`Unknown connection state: ${state}`);
  }
}

function getHumanReadableDuration(diffMs: number): string {
  if (diffMs < 1000) {
    return "just now";
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) {
    return "a few seconds ago";
  } else if (seconds < 10) {
    return "less than 10 seconds ago";
  } else if (seconds < 20) {
    return "less than 20 seconds ago";
  } else if (seconds < 40) {
    return "half a minute ago";
  } else if (seconds < 60) {
    return "less than a minute ago";
  } else if (seconds < 90) {
    return "about a minute ago";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (diffMs < 60 * 60 * 1000) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
}

export default function Connection({
  state,
  lastMessageAt,
}: {
  state: ConnectionState;
  lastMessageAt?: number;
}) {
  const debouncedState = useDebounce(state, 500);

  const [durationMsg, setDurationMsg] = React.useState<string | undefined>(
    lastMessageAt
      ? getHumanReadableDuration(Date.now() - lastMessageAt)
      : undefined,
  );

  React.useEffect(() => {
    function update() {
      setDurationMsg(
        lastMessageAt
          ? getHumanReadableDuration(Date.now() - lastMessageAt)
          : undefined,
      );
    }
    update();
    const id = setInterval(update, DURATION_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [lastMessageAt]);

  const message = formatConnectionState(debouncedState);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <div
        className={clsx("h-2 w-2 shrink-0 rounded-full", {
          "bg-red-500": debouncedState === ConnectionState.ERROR,
          "bg-yellow-500": debouncedState === ConnectionState.CONNECTING,
          "bg-green-500": debouncedState === ConnectionState.CONNECTED,
          "bg-slate-500":
            debouncedState === ConnectionState.DISCONNECTING ||
            debouncedState === ConnectionState.DISCONNECTED,
        })}
      />
      {durationMsg && lastMessageAt ? (
        <div>
          {message + " "}
          <Popover content={new Date(lastMessageAt).toLocaleTimeString()}>
            <button className="underline decoration-slate-500 decoration-dashed">
              {durationMsg}.
            </button>
          </Popover>
        </div>
      ) : (
        message
      )}
    </div>
  );
}
