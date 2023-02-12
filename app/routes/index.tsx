import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Link from "~/components/link";

interface Game {
  season: string;
  game: string;
}

export function loader() {
  const games: Game[] = [
    { season: "1", game: "1" },
    { season: "1", game: "2" },
  ];

  return json({ games });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <Link to="https://j-archive.com">J! Archive &rarr;</Link>
      <p className="mb-4">
        Visit the J! Archive home page itself to find episode dates.
      </p>
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <ul className="list-disc list-inside">
        {data.games.map((g) => (
          <li key={g.game}>
            <Link to={"/" + g.game + "/play"}>
              Season {g.season} Game {g.game}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
