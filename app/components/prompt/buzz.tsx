import { CLUE_TIMEOUT_MS } from "~/engine/engine";
import type { Player } from "~/engine/engine";
import { stringToHslColor } from "~/utils/utils";

function durationMessage(durationMs: number) {
  switch (durationMs) {
    case -1:
      return "cannot buzz";
    case CLUE_TIMEOUT_MS + 1:
      return "timed out";
    default:
      return durationMs + "ms";
  }
}

export default function Buzz({
  player,
  durationMs,
}: {
  player?: Player;
  durationMs: number;
}) {
  const color = player ? stringToHslColor(player.userId) : "gray";
  const durationMsg = durationMessage(durationMs);
  return (
    <div
      className="px-2 py-1 flex flex-col items-center justify-center text-white text-shadow"
      style={{ color }}
    >
      <div className="font-bold">{player?.name ?? "Unknown player"}</div>
      <div>{durationMsg}</div>
    </div>
  );
}
