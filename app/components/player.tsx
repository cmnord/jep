import { Form, useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";

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

function PlayerIcon({ userId, name }: { userId: string; name: string }) {
  const color = stringToHslColor(userId);
  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-blue-1000 bg-gradient-to-b from-blue-700 border-2 border-black p-3 text-white text-sm flex items-center justify-center font-mono shadow"
        style={{ color: color }}
      >
        {name}
      </div>
    </div>
  );
}

export function EditablePlayerIcon({
  userId,
  name,
  onChangeName,
}: {
  userId: string;
  name: string;
  onChangeName?: (name: string) => void;
}) {
  const color = stringToHslColor(userId);
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleClickEdit = () => {
    inputRef.current?.select();
  };

  return (
    <div className="flex gap-2 items-center">
      <label htmlFor="name" className="text-gray-500 text-sm">
        You are:
      </label>
      <div className="bg-blue-1000 bg-gradient-to-b from-blue-700 border-2 border-black text-white text-sm flex items-center justify-center font-mono shadow">
        <input
          ref={inputRef}
          type="text"
          id="name"
          name="name"
          className="p-3 bg-transparent"
          style={{ color: color }}
          value={name}
          onChange={
            onChangeName ? (e) => onChangeName(e.target.value) : undefined
          }
          onFocus={() => setEditing(true)}
        />
        <button type="button" onClick={handleClickEdit} className="pr-3">
          {/* Heroicon name: solid/pencil-square */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={classNames("w-6 h-6 hover:text-gray-300 transition", {
              "opacity-0 pointer-events-none": editing,
            })}
          >
            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
            <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
          </svg>
        </button>
      </div>
      <button
        type="submit"
        className={classNames("pl-3", {
          "opacity-0 pointer-events-none": !editing,
        })}
        onClick={() => setEditing(false)}
      >
        {/* Heroicon name: solid/check-circle*/}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-green-600 hover:text-green-800 transition-colors"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default function Players({
  players,
  userId,
  roomName,
}: {
  players: Map<string, Player>;
  userId: string;
  roomName: string;
}) {
  const player = players.get(userId) ?? { userId, name: "You" };

  const [name, setName] = React.useState(player.name);

  const fetcher = useFetcher();

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/player`}>
      <div className="mb-4">
        <EditablePlayerIcon
          userId={player.userId}
          name={name}
          onChangeName={(n) => setName(n)}
        />
        <input
          type="hidden"
          name="userId"
          aria-describedby="upload_help"
          value={userId}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from(players.values()).map((p) => (
          <PlayerIcon key={p.userId} userId={p.userId} name={p.name} />
        ))}
      </div>
    </fetcher.Form>
  );
}
