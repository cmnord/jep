import classNames from "classnames";
import type { Player } from "~/engine";
import { CANT_BUZZ_FLAG, CLUE_TIMEOUT_MS } from "~/engine";
import { PlayerIcon } from "../player";

function showBuzz(durationMs?: number) {
  switch (durationMs) {
    case undefined:
    case CANT_BUZZ_FLAG:
    case CLUE_TIMEOUT_MS + 1:
      return false;
    default:
      return true;
  }
}

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
  signDisplay: "always", // Show +/- for positive and negative values.
});

function Buzz({
  player,
  wonBuzz,
  clueValue,
}: {
  player: Player;
  wonBuzz: boolean;
  clueValue: number;
}) {
  const clueValueStr = clueValue ? formatter.format(clueValue) : undefined;

  return (
    <div>
      {wonBuzz && clueValueStr !== undefined ? (
        <span
          className={classNames(
            "absolute -top-5 font-bold animate-bounce text-shadow",
            {
              "text-green-300": clueValue >= 0,
              "text-red-300": clueValue < 0,
            }
          )}
        >
          {clueValueStr}
        </span>
      ) : null}
      <PlayerIcon player={player} />
    </div>
  );
}

export function Buzzes({
  buzzes,
  clueValue,
  players,
  showWinner,
  winningBuzzer,
  buzzCorrect,
}: {
  buzzes: Map<string, number>;
  clueValue: number;
  players: Map<string, Player>;
  showWinner: boolean;
  winningBuzzer?: string;
  buzzCorrect: boolean;
}) {
  // sort buzzes by time
  const sortedBuzzes = Array.from(buzzes.entries())
    .filter(([, b]) => showBuzz(b))
    .sort(([aUserId], [bUserId]) => {
      const aDurationMs = buzzes.get(aUserId);
      const bDurationMs = buzzes.get(bUserId);
      if (aDurationMs === undefined) {
        return 1;
      } else if (bDurationMs === undefined) {
        return -1;
      }
      return aDurationMs - bDurationMs;
    });
  const sortedPlayers = sortedBuzzes
    .map(([userId]) => players.get(userId))
    .filter((p): p is Player => p !== undefined);

  return (
    <div className="relative">
      <div className="flex gap-4 h-8 m-2 w-full overflow-x-scroll">
        {sortedPlayers.map((player, i) => (
          <Buzz
            key={i}
            player={player}
            wonBuzz={winningBuzzer === player.userId && showWinner}
            clueValue={buzzCorrect ? clueValue : -1 * clueValue}
          />
        ))}
      </div>
    </div>
  );
}
