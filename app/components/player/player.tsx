import classNames from "classnames";

import type { Player } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatDollars, stringToHslColor } from "~/utils";

// https://stackoverflow.com/questions/70524820/is-there-still-no-easy-way-to-split-strings-with-compound-emojis-into-an-array
const COMPOUND_EMOJI_REGEX =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gsu;

export function PlayerScore({
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
        style={{ color }}
      >
        {player.name}
        {winning && <div>👑</div>}
      </div>
      <div
        className={classNames(
          "text-shadow-md w-1/3 grow font-impact text-xl sm:w-auto",
          {
            "text-white": player.score >= 0,
            "text-red-400": player.score < 0,
          },
        )}
      >
        {formatDollars(player.score)}
      </div>
    </div>
  );
}

export function PlayerIcon({ player }: { player: Player }) {
  const backgroundColor = stringToHslColor(player.userId);
  const matches = player.name.match(COMPOUND_EMOJI_REGEX);
  const firstChar = matches ? matches[0] : player.name[0];
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor }}
      title={player.name}
    >
      <div className="text-md font-mono font-bold text-white">{firstChar}</div>
    </div>
  );
}

function getMaxScore(others: Player[], you?: Player) {
  const bestOther = others.at(0);
  if (bestOther && you) {
    return Math.max(bestOther.score, you.score);
  } else if (bestOther) {
    return bestOther.score;
  } else if (you) {
    return you.score;
  }
  return 0;
}

export function PlayerScores({ userId }: { userId: string }) {
  const { players, boardControl } = useEngineContext();

  const yourPlayer = players.get(userId);

  // sort all other players from highest to lowest score
  const sortedOtherPlayers = Array.from(players.values())
    .filter((p) => p.userId !== userId)
    .sort((a, b) => b.score - a.score);

  const maxScore = getMaxScore(sortedOtherPlayers, yourPlayer);

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
      {yourPlayer ? (
        <PlayerScore
          player={yourPlayer}
          hasBoardControl={yourPlayer.userId === boardControl}
          winning={yourPlayer.score === maxScore}
        />
      ) : null}
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
