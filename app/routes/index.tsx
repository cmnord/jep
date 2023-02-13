import { ActionArgs, redirect } from "@remix-run/node";
import { Form, Link, useTransition } from "@remix-run/react";

import { fetchRandomCategories } from "~/models/cluebase.server";
import { makeGameId } from "~/utils/utils";
import Anchor from "~/components/link";

export async function action({ request }: ActionArgs) {
  const categories = await fetchRandomCategories();
  const gameId = makeGameId();

  const url = new URL(request.url);
  url.pathname = "/game/" + gameId;
  url.searchParams.set("categories", categories.toString());

  return redirect(url.toString());
}

export default function Index() {
  const transition = useTransition();

  return (
    <div className="p-12">
      <Anchor to="https://j-archive.com">J! Archive &rarr;</Anchor>
      <p className="mb-4">
        Visit the J! Archive home page itself to find episode dates.
      </p>
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <div className="flex gap-4">
        <button className="inline-flex w-full justify-center rounded-md border border-transparent border-blue-600 px-4 py-2 text-base font-medium text-blue-600 shadow-sm hover:text-blue-700 hover:border-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:text-sm">
          <Link to={"/1/play"}>Play an example game</Link>
        </button>
        <Form method="post">
          <button
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
            type="submit"
          >
            {transition.state === "loading"
              ? "Loading..."
              : "Play a random game"}
          </button>
        </Form>
      </div>
    </div>
  );
}
