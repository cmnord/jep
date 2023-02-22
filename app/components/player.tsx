import { Player } from "~/utils/use-game";

const SATURATION = 60;
const LIGHTNESS = 85;

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** stringToHslColor generates a deterministic hue from the input str and then
 * adds saturation and lightness to make an HSL color string. */
function stringToHslColor(str: string) {
  const hash = cyrb53(str, 123);
  const h = hash % 360;
  return `hsl(${h}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

export function PlayerIcon({ player }: { player: Player }) {
  const color = stringToHslColor(player.userId);
  return (
    <div
      className="p-3 bg-blue-1000 bg-gradient-to-b from-blue-700 border-2 border-black text-white text-sm flex items-center justify-center font-mono shadow"
      style={{ color: color }}
      title={player.name}
    >
      {player.name}
    </div>
  );
}

export default function Players({
  players,
  userId,
}: {
  players: Set<Player>;
  userId: string;
}) {
  const player = Array.from(players.keys()).find(
    (p) => p.userId === userId
  ) ?? { userId, name: "You" };

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center">
        <p className="text-gray-500 text-sm">You are: </p>
        <PlayerIcon player={player} />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from(players.keys()).map((p) => (
          <PlayerIcon key={p.userId} player={p} />
        ))}
      </div>
    </div>
  );
}
