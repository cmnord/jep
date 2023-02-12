import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

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
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <a href="https://j-archive.com">J! Archive &rarr;</a>
      <p>Visit the J! Archive home page itself to find episode dates.</p>
      <h2>Games</h2>
      <ul>
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
