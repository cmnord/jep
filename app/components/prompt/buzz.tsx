import type { Player } from "~/engine/engine";
import { CLUE_TIMEOUT_MS } from "~/engine/engine";
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

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
});

function Buzz({
  player,
  durationMs,
  won,
  clueValue,
}: {
  player?: Player;
  durationMs: number;
  won: boolean;
  clueValue?: number;
}) {
  const color = player ? stringToHslColor(player.userId) : "gray";
  const durationMsg = durationMessage(durationMs);
  const clueValueStr = clueValue ? formatter.format(clueValue) : undefined;

  return (
    <div
      className="relative px-2 py-1 flex flex-col items-center justify-center text-white text-shadow"
      style={{ color }}
    >
      {won && clueValueStr !== undefined ? (
        <span className="absolute -top-5 text-green-300 font-bold animate-bounce">
          +{clueValueStr}
        </span>
      ) : null}
      <div className="font-bold">{player?.name ?? "Unknown player"}</div>
      <div>{durationMsg}</div>
    </div>
  );
}

export default function Buzzes({
  buzzes,
  clueValue,
  players,
  showWinner,
  winningBuzzer,
}: {
  buzzes?: Map<string, number>;
  clueValue?: number;
  players: Map<string, Player>;
  showWinner: boolean;
  winningBuzzer?: string;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-4 ml-4">
        {buzzes
          ? // TODO: sort buzzes?
            Array.from(buzzes.entries()).map(([userId, durationMs], i) => (
              <Buzz
                key={i}
                player={players.get(userId)}
                durationMs={durationMs}
                won={winningBuzzer === userId && showWinner}
                clueValue={clueValue}
              />
            ))
          : null}
      </div>
    </div>
  );
}
