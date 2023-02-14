import { ActionArgs, redirect } from "@remix-run/node";
import { Form, Link, useTransition } from "@remix-run/react";

import { fetchRandomCategories } from "~/models/cluebase.server";
import { makeGameId } from "~/utils/utils";
import Anchor from "~/components/link";
import Button from "~/components/button";

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
      <div className="flex flex-col gap-4 flex-wrap items-start">
        <Button>
          <Link to={"/1/play"}>Play an example game</Link>
        </Button>
        <Button>
          <Link to={"/game/mock"}>Play a mock game</Link>
        </Button>
        <Form method="post">
          <Button type="primary" htmlType="submit">
            {transition.state === "loading"
              ? "Loading..."
              : "Play a random game from Cluebase"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
