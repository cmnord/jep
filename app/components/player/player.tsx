import classNames from "classnames";

import type { Player } from "~/engine";
import { useEngineContext } from "~/engine";
import { stringToHslColor } from "~/utils/utils";

import EditPlayerForm from "./edit-player";

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
});

function PlayerIcon({
  player,
  boardControl,
}: {
  player: Player;
  boardControl: boolean;
}) {
  const color = stringToHslColor(player.userId);
  return (
    <div
      className={classNames(
        "flex flex-col items-center gap-2 p-3 bg-blue-1000 bg-gradient-to-b from-blue-700 shadow",
        {
          "border-2 border-gray-800 opacity-70": !boardControl,
          "border-4 border-yellow-400": boardControl,
        }
      )}
    >
      <div
        className={classNames(
          "text-sm flex items-center justify-center font-mono"
        )}
        style={{ color: color }}
      >
        {player.name}
      </div>
      <div className="text-white text-xl font-impact text-shadow-md">
        {formatter.format(player.score)}
      </div>
    </div>
  );
}

export function Players({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { players, boardControl } = useEngineContext();

  return (
    <div>
      <EditPlayerForm roomName={roomName} userId={userId} />
      <div className="flex flex-wrap gap-2">
        {Array.from(players.values()).map((p) => (
          <PlayerIcon
            key={p.userId}
            player={p}
            boardControl={p.userId === boardControl}
          />
        ))}
      </div>
    </div>
  );
}
