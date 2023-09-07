import classNames from "classnames";

import type { Player } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { formatDollars, stringToHslColor } from "~/utils";
import { RoomProps } from "../game";
import { EditPlayerForm } from "./edit-player";

// https://stackoverflow.com/questions/70524820/is-there-still-no-easy-way-to-split-strings-with-compound-emojis-into-an-array
const COMPOUND_EMOJI_REGEX =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gsu;

export function PlayerScoreBox({
  player,
  hasBoardControl,
  children,
}: {
  player: Player;
  hasBoardControl: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={classNames(
        "flex gap-2 border-2 bg-blue-1000 bg-gradient-to-b from-blue-800 p-2 sm:p-3",
        {
          "border-transparent": !hasBoardControl,
          "animate-borderPulse": hasBoardControl,
        },
      )}
    >
      <PlayerIcon player={player} />
      <div className="w-full">
        {children}
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
    </div>
  );
}

/** PlayerScore is a presentational component showing the player's icon, name,
 * and score.
 */
export function PlayerScore({
  player,
  hasBoardControl,
  winning,
}: {
  player: Player;
  hasBoardControl: boolean;
  winning: boolean;
}) {
  return (
    <PlayerScoreBox hasBoardControl={hasBoardControl} player={player}>
      <div className="flex w-full gap-2 text-2xl">
        <p className="font-handwriting font-bold">{player.name}</p>
        {winning && <div className="ml-auto">👑</div>}
      </div>
    </PlayerScoreBox>
  );
}

/** PlayerIcon is a round bubble with the first character of the player's name in
 * it.
 */
export function PlayerIcon({
  player,
}: {
  player: Pick<Player, "name" | "userId">;
}) {
  const backgroundColor = stringToHslColor(player.userId);
  const matches = player.name.match(COMPOUND_EMOJI_REGEX);
  const firstChar = matches ? matches[0] : player.name[0];
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
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

/** PlayerScores is a connected component that:
 * - Lets the current player edit their name
 * - Shows each player's name and score
 */
export function PlayerScores({ roomId, userId }: RoomProps) {
  const { players, boardControl, type, round } = useEngineContext();

  const yourPlayer = players.get(userId);

  // sort all other players from highest to lowest score
  const sortedOtherPlayers = Array.from(players.values())
    .filter((p) => p.userId !== userId)
    .sort((a, b) => b.score - a.score);

  const maxScore = getMaxScore(sortedOtherPlayers, yourPlayer);

  const editable =
    type !== GameState.GameOver &&
    (type !== GameState.PreviewRound || round !== 0);

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
      {yourPlayer ? (
        editable ? (
          <EditPlayerForm
            roomId={roomId}
            userId={userId}
            winning={yourPlayer.score === maxScore}
          />
        ) : (
          <PlayerScore
            player={yourPlayer}
            hasBoardControl={yourPlayer.userId === boardControl}
            winning={yourPlayer.score === maxScore}
          />
        )
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
