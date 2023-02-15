import { ActionArgs, redirect } from "@remix-run/node";
import { Form, Link, useTransition } from "@remix-run/react";
import * as React from "react";

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

  // YYYY-MM-DD format
  const [date, setDate] = React.useState("");

  const handleChangeDate = (d: string) => {
    setDate(d);
  };

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
        <Form method="post" className="flex flex-col gap-4 items-start w-full">
          <Button type="primary" htmlType="submit">
            {transition.state === "loading"
              ? "Loading..."
              : "Play a random game from Cluebase"}
          </Button>
        </Form>
        <div className="flex gap-4">
          <div className="relative max-w-sm">
            <input
              value={date}
              onChange={(e) => handleChangeDate(e.target.value)}
              name="date"
              type="date"
              className={
                "block w-full rounded-md border px-4 py-2 text-base font-medium shadow-sm transition-colors " +
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 " +
                "sm:w-auto sm:text-sm " +
                "border-blue-600 text-slate-600 hover:text-slate-700 hover:border-blue-700"
              }
              placeholder="Select date"
            />
          </div>
          <Link to={`/${date}/play`}>
            <Button disabled={date === ""}>
              Play a game from {date ? date : "a specific air date"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
