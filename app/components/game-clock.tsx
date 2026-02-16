import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import useSoloAction from "~/utils/use-solo-action";

const UPDATE_INTERVAL_MS = 200;

function formatElapsedTime(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export default function GameClock({ roomId }: Pick<RoomProps, "roomId">) {
  const { clockRunning, clockAccumulatedMs, clockLastResumedAt, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const [displayMs, setDisplayMs] = React.useState(clockAccumulatedMs);

  React.useEffect(() => {
    if (!clockRunning || !clockLastResumedAt) {
      setDisplayMs(clockAccumulatedMs);
      return;
    }

    let animationFrameId: number;
    let lastUpdate = 0;

    const tick = () => {
      const now = Date.now();
      if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
        const liveDelta = now - new Date(clockLastResumedAt).getTime();
        setDisplayMs(clockAccumulatedMs + Math.max(0, liveDelta));
        lastUpdate = now;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [clockRunning, clockAccumulatedMs, clockLastResumedAt]);

  function handleToggle() {
    fetcher.submit(null, {
      method: "post",
      action: `/room/${roomId}/toggle-clock`,
    });
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      title={clockRunning ? "Pause clock" : "Resume clock"}
    >
      <span className="text-base">{clockRunning ? "\u23F8" : "\u25B6"}</span>
      <span className="font-mono tabular-nums">
        {formatElapsedTime(displayMs)}
      </span>
    </button>
  );
}
