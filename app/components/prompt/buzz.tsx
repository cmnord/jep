import { PlayerIcon } from "~/components/player";
import type { Player } from "~/engine";
import { CANT_BUZZ_FLAG, CLUE_TIMEOUT_MS, useEngineContext } from "~/engine";

function showBuzz(durationMs?: number) {
  switch (true) {
    case durationMs === undefined:
    case durationMs === CANT_BUZZ_FLAG:
    case durationMs && durationMs > CLUE_TIMEOUT_MS:
      return false;
    default:
      return true;
  }
}

export function Buzzes({
  buzzes: optimisticBuzzes,
}: {
  buzzes?: Map<string, number>;
}) {
  const { activeClue, buzzes: serverBuzzes, players } = useEngineContext();

  if (!activeClue) {
    throw new Error("No active clue");
  }

  const buzzes = optimisticBuzzes ?? serverBuzzes;

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
      <div className="m-2 flex h-8 w-full gap-4 overflow-x-scroll">
        {sortedPlayers.map((player, i) => (
          <PlayerIcon key={i} player={player} />
        ))}
      </div>
    </div>
  );
}
