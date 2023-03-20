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
  hasBoardControl,
}: {
  player: Player;
  hasBoardControl: boolean;
}) {
  const color = stringToHslColor(player.userId);
  return (
    <div
      className={classNames(
        "flex flex-col items-center gap-2 p-3 bg-blue-1000 bg-gradient-to-b from-blue-700 shadow",
        {
          "border-2 border-gray-800 opacity-70": !hasBoardControl,
          "border-4 border-yellow-400": hasBoardControl,
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

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  return (
    <div className="flex flex-col gap-4">
      {boardControlName && (
        <p>
          <span className="font-bold">{boardControlName}</span> has control of
          the board.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {Array.from(players.values()).map((p) => (
          <PlayerIcon
            key={p.userId}
            player={p}
            hasBoardControl={p.userId === boardControl}
          />
        ))}
      </div>
      <EditPlayerForm roomName={roomName} userId={userId} />
    </div>
  );
}
