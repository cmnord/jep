import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatElapsedTime } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

const UPDATE_INTERVAL_MS = 200;
const PAUSE_SYMBOL = "\u23F8"; // ⏸
const PLAY_SYMBOL = "\u25B6"; // ▶

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
        const liveDelta = now - clockLastResumedAt;
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
      <span className="text-base">{clockRunning ? PAUSE_SYMBOL : PLAY_SYMBOL}</span>
      <span className="font-mono tabular-nums">
        {formatElapsedTime(displayMs)}
      </span>
    </button>
  );
}
