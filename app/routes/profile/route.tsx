import * as React from "react";
import { data, redirect, useFetcher } from "react-router";

import { ErrorMessage, SuccessMessage } from "~/components/error";
import Main from "~/components/main";
import SoundControl from "~/components/sound";
import Upload from "~/components/upload";
import WagerHintsControl from "~/components/wager-hints-control";
import { requireAuthSession } from "~/models/auth";
import { getGamesForUser } from "~/models/game.server";
import { getSolvesForUser } from "~/models/solves.server";
import { getUserByEmail } from "~/models/user/service.server";
import { getSessionFormState } from "~/session.server";
import { BASE_URL } from "~/utils";

import type { Route } from "./+types/route";
import { GameInfo } from "./game-info";
import SolveInfo from "./solve-info";

export async function loader({ request }: Route.LoaderArgs) {
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
  return data(
    { user, formState, games, solves, env: { BASE_URL }, authSession },
    { headers },
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const patchGame = useFetcher<never>();
  const uploadGame = useFetcher<never>();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [formState, setFormState] = React.useState(loaderData.formState);

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

  const loaderFormState = loaderData.formState;
  React.useEffect(() => {
    setFormState(loaderFormState);

    if (loaderFormState?.success) {
      // Use JavaScript to reset form
      const handler = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setFormState(undefined);
      }, 5000);
      return () => window.clearTimeout(handler);
    }
  }, [loaderFormState]);

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
        <p className="mb-4">{loaderData.user?.email}</p>
        <h2 className="mb-4 text-2xl font-semibold">Settings</h2>
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-slate-600">Sound</span>
          <SoundControl />
        </div>
        <div className="mb-6">
          <WagerHintsControl />
        </div>
        <h2 className="mb-4 text-2xl font-semibold">My Games</h2>
        <Upload
          fetcher={uploadGame}
          formRef={formRef}
          loggedIn={loaderData.authSession !== null}
          redirectTo="/profile"
        />
        {loaderData.games.length === 0 ? (
          <p className="text-sm text-slate-500">No games found.</p>
        ) : null}
        <ul className="mb-4 list-inside list-disc text-slate-700">
          {loaderData.games.map((game) => (
            <GameInfo
              key={game.id}
              BASE_URL={loaderData.env.BASE_URL}
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
          {loaderData.solves.map((solve) => (
            <SolveInfo key={solve.id} solve={solve} />
          ))}
        </div>
      </Main>
    </div>
  );
}
