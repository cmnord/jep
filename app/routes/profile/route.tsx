import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import * as React from "react";

import { ErrorMessage, SuccessMessage } from "~/components/error";
import Main from "~/components/main";
import Upload from "~/components/upload";
import { requireAuthSession } from "~/models/auth";
import { getGamesForUser } from "~/models/game.server";
import { getSolvesForUser } from "~/models/solves.server";
import { getUserByEmail } from "~/models/user/service.server";
import { getSessionFormState } from "~/session.server";
import { BASE_URL } from "~/utils";

import { GameInfo } from "./game-info";
import SolveInfo from "./solve-info";

export async function loader({ request }: LoaderFunctionArgs) {
  const authSession = await requireAuthSession(request);

  if (!authSession) {
    throw redirect("/login");
  }

  const games = await getGamesForUser(
    authSession.userId,
    authSession.accessToken,
  );

  const solves = await getSolvesForUser(
    authSession.userId,
    authSession.accessToken,
  );

  const [formState, headers] = await getSessionFormState(request);

  const user = await getUserByEmail(authSession.email, authSession.accessToken);
  return json(
    { user, formState, games, solves, env: { BASE_URL }, authSession },
    { headers },
  );
}

export default function Profile() {
  const data = useLoaderData<typeof loader>();

  const patchGame = useFetcher<never>();
  const uploadGame = useFetcher<never>();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [formState, setFormState] = React.useState(data.formState);

  React.useEffect(() => {
    if (patchGame.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [patchGame.state]);

  React.useEffect(() => {
    if (uploadGame.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [uploadGame.state]);

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
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
        <p className="mb-4">{data.user?.email}</p>
        <h1 className="mb-4 text-2xl font-semibold">My Games</h1>
        <Upload
          fetcher={uploadGame}
          formRef={formRef}
          loggedIn={data.authSession !== null}
          redirectTo="/profile"
        />
        {data.games.length === 0 ? (
          <p className="text-sm text-slate-500">No games found.</p>
        ) : null}
        <ul className="mb-4 list-inside list-disc text-slate-700">
          {data.games.map((game) => (
            <GameInfo
              key={game.id}
              BASE_URL={data.env.BASE_URL}
              game={game}
              fetcher={patchGame}
            />
          ))}
        </ul>
        {formState ? (
          formState.success ? (
            <SuccessMessage>{formState.message}</SuccessMessage>
          ) : (
            <ErrorMessage>{formState.message}</ErrorMessage>
          )
        ) : null}
        <h1 className="mb-4 text-2xl font-semibold">My Attempts / Solves</h1>
        <div>
          {data.solves.map((solve) => (
            <SolveInfo key={solve.id} solve={solve} />
          ))}
        </div>
      </Main>
    </div>
  );
}
