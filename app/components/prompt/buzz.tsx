import classNames from "classnames";

import { PlayerIcon } from "~/components/player";
import type { Player } from "~/engine";
import { CANT_BUZZ_FLAG, CLUE_TIMEOUT_MS, useEngineContext } from "~/engine";
import { formatDollarsWithSign } from "~/utils";

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

function Buzz({
  player,
  answered,
  clueValue,
}: {
  player: Player;
  answered: boolean;
  clueValue: number;
}) {
  const clueValueStr = formatDollarsWithSign(clueValue);

  return (
    <div>
      {answered ? (
        <span
          className={classNames(
            "text-shadow absolute -top-5 animate-bounce font-bold",
            {
              "text-green-300": clueValue >= 0,
              "text-red-300": clueValue < 0,
            },
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
  buzzes: optimisticBuzzes,
  showWinner,
}: {
  buzzes?: Map<string, number>;
  showWinner: boolean;
}) {
  const {
    activeClue,
    answeredBy,
    buzzes: serverBuzzes,
    getClueValue,
    players,
  } = useEngineContext();

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
        {sortedPlayers.map((player, i) => {
          const answer = answeredBy(
            activeClue[0],
            activeClue[1],
            player.userId,
          );
          const clueValue = getClueValue(activeClue, player.userId);
          const correct = answer === true;
          return (
            <Buzz
              key={i}
              player={player}
              answered={answer !== undefined && showWinner}
              clueValue={correct ? clueValue : -1 * clueValue}
            />
          );
        })}
      </div>
    </div>
  );
}
