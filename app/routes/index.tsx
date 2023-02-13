import { ActionArgs, json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useTransition } from "@remix-run/react";

import { fetchRandomCategories } from "~/models/cluebase.server";
import { makeGameId } from "~/utils/utils";
import Link from "~/components/link";
import { fetchAllGames } from "~/models/cluebase.server";

export async function loader() {
  const games = await fetchAllGames({ limit: 2 });

  return json({ games });
}

export async function action({ request }: ActionArgs) {
  const categories = await fetchRandomCategories();
  const gameId = makeGameId();

  const url = new URL(request.url);
  url.pathname = "/game/" + gameId;
  url.searchParams.set("categories", categories.toString());

  return redirect(url.toString());
}

export default function Index() {
  const { games } = useLoaderData<typeof loader>();
  const transition = useTransition();

  return (
    <div>
      <Link to="https://j-archive.com">J! Archive &rarr;</Link>
      <p className="mb-4">
        Visit the J! Archive home page itself to find episode dates.
      </p>
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <ul className="list-disc list-inside mb-4">
        {games.map((g) => (
          <li key={g.id}>
            <Link to={"/" + g.id + "/play"}>
              Season {g.season_id} Game {g.id}
            </Link>
          </li>
        ))}
      </ul>
      <Form method="post">
        <button
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
          type="submit"
        >
          {transition.state === "loading" ? "Loading..." : "Play a random game"}
        </button>
      </Form>
    </div>
  );
}
