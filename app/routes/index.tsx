import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import Anchor from "~/components/link";
import Button from "~/components/button";
import { getAllGames } from "~/models/game.server";
import { DefaultErrorBoundary } from "~/components/error";

export async function loader() {
  const games = await getAllGames();

  return json({ games });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="p-12">
      <Anchor to="https://j-archive.com">J! Archive &rarr;</Anchor>
      <p className="mb-4">
        Visit the J! Archive home page itself to find episode dates.
      </p>
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <div className="flex flex-col gap-4 items-start">
        <Button>
          <Link to={"/game/mock"}>Play a mock game</Link>
        </Button>
      </div>
      <div>{JSON.stringify(data.games)}</div>
    </div>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
