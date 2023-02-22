import { Player } from "~/utils/use-game";

const SATURATION = 60;
const LIGHTNESS = 65;

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
      className="rounded-full px-3 py-1 text-white text-sm flex items-center justify-center"
      style={{ backgroundColor: color }}
      title={player.name}
    >
      {player.name}
    </div>
  );
}

export default function Players({ players }: { players: Set<Player> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from(players.keys()).map((p) => (
        <PlayerIcon key={p.userId} player={p} />
      ))}
    </div>
  );
}