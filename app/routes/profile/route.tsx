import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import * as React from "react";

import { ErrorMessage, SuccessMessage } from "~/components/error";
import { requireAuthSession } from "~/models/auth";
import { getGamesForUser } from "~/models/game.server";
import { getUserByEmail } from "~/models/user/service.server";
import { getSessionFormState } from "~/session.server";
import { BASE_URL } from "~/utils";

import { GameInfo } from "./game-info";

export async function loader({ request }: LoaderArgs) {
  const authSession = await requireAuthSession(request);

  if (!authSession) {
    throw redirect("/login");
  }

  const games = await getGamesForUser(
    authSession.userId,
    authSession.accessToken
  );

  const [formState, headers] = await getSessionFormState(request);

  const user = await getUserByEmail(authSession.email, authSession.accessToken);
  return json({ user, formState, games, env: { BASE_URL } }, { headers });
}

export default function Profile() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [formState, setFormState] = React.useState(data.formState);

  React.useEffect(() => {
    if (fetcher.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [fetcher.state]);

  React.useEffect(() => {
    setFormState(data.formState);

    if (data.formState?.success) {
      // Use JavaScript to reset form
      const handler = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setFormState(undefined);
      }, 5000);
      return () => window.clearTimeout(handler);
    }
  }, [data.formState]);

  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Profile</h2>
        <p className="mb-4">{data.user?.email}</p>
        <h2 className="mb-4 text-2xl font-semibold">My Games</h2>
        <ul className="list-inside list-disc text-slate-700">
          {data.games.map((game) => (
            <GameInfo
              key={game.id}
              BASE_URL={data.env.BASE_URL}
              game={game}
              fetcher={fetcher}
            />
          ))}
        </ul>
        {formState ? (
          formState.success ? (
            <SuccessMessage message={formState.message} />
          ) : (
            <ErrorMessage message={formState.message} />
          )
        ) : null}
      </main>
    </div>
  );
}
