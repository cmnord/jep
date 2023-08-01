import classNames from "classnames";

import type { Player } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatDollars, stringToHslColor } from "~/utils";

function PlayerScore({
  player,
  hasBoardControl,
  winning,
}: {
  player: Player;
  hasBoardControl: boolean;
  winning: boolean;
}) {
  const color = stringToHslColor(player.userId);
  return (
    <div
      className={classNames(
        "flex items-center gap-2 border-2 bg-blue-1000 bg-gradient-to-b from-blue-800 p-2 sm:flex-col sm:p-3",
        {
          "border-slate-200": !hasBoardControl,
          "border-yellow-400": hasBoardControl,
        },
      )}
    >
      <div
        className="flex w-2/3 grow flex-wrap gap-2 font-handwriting text-2xl font-bold sm:w-auto"
        style={{ color: color }}
      >
        {player.name}
        {winning && <div>👑</div>}
      </div>
      <div className="text-shadow-md w-1/3 grow font-impact text-xl text-white sm:w-auto">
        {formatDollars(player.score)}
      </div>
    </div>
  );
}

export function PlayerIcon({ player }: { player: Player }) {
  const color = stringToHslColor(player.userId);
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      title={player.name}
    >
      <div className="text-md font-mono font-bold text-white">
        {player.name[0]}
      </div>
    </div>
  );
}

export function PlayerScores({ userId }: { userId: string }) {
  const { players, boardControl } = useEngineContext();

  const yourPlayer = players.get(userId);
  if (!yourPlayer) {
    throw new Error(`Player ${userId} not found`);
  }

  // sort all other players from highest to lowest score
  const sortedOtherPlayers = Array.from(players.values())
    .filter((p) => p.userId !== userId)
    .sort((a, b) => b.score - a.score);

  const maxScore = sortedOtherPlayers[0]
    ? sortedOtherPlayers[0].score
    : yourPlayer.score;

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
      <PlayerScore
        player={yourPlayer}
        hasBoardControl={yourPlayer.userId === boardControl}
        winning={yourPlayer.score === maxScore}
      />
      {sortedOtherPlayers.map((p, i) => (
        <PlayerScore
          key={i}
          player={p}
          hasBoardControl={p.userId === boardControl}
          winning={p.score === maxScore}
        />
      ))}
    </div>
  );
}
