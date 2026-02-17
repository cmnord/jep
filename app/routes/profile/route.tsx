import * as React from "react";
import { data, redirect, useFetcher } from "react-router";

import { ErrorMessage, SuccessMessage } from "~/components/error";
import Main from "~/components/main";
import OfflineIndicator from "~/components/offline-indicator";
import SoundControl from "~/components/sound";
import Upload from "~/components/upload";
import WagerHintsControl from "~/components/wager-hints-control";
import { requireAuthSession, type AuthSession } from "~/models/auth";
import { getGamesForUser, type DbGame } from "~/models/game.server";
import { getSolvesForUser, type Solve } from "~/models/solves.server";
import { getUserByEmail } from "~/models/user/service.server";
import { getSessionFormState } from "~/session.server";
import { BASE_URL } from "~/utils";
import { getAllCachedGames, type CachedGame } from "~/utils/offline-storage";

interface OnlineLoaderData {
  user:
    | { created_at: string; email: string; id: string; settings: unknown }
    | undefined;
  formState: { success: boolean; message: string } | undefined;
  games: DbGame[];
  solves: Solve[];
  env: { BASE_URL: string };
  authSession: AuthSession | null;
}

function isOnlineLoaderData(data: object): data is OnlineLoaderData {
  return "games" in data;
}

import type { Route } from "./+types/route";
import { DownloadedGameInfo } from "./downloaded-game-info";
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

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const cachedGames = await getAllCachedGames();
  try {
    const serverData = await serverLoader();
    return { ...serverData, cachedGames, offline: false as const };
  } catch {
    return { cachedGames, offline: true as const };
  }
}
clientLoader.hydrate = true as const;

function DownloadedGamesSection({
  cachedGames,
  onRemoved,
}: {
  cachedGames: CachedGame[];
  onRemoved: (gameId: string) => void;
}) {
  if (cachedGames.length === 0) return null;
  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold">Downloaded Games</h2>
      <ul className="mb-4 list-inside list-disc text-slate-700">
        {cachedGames.map((cg) => (
          <DownloadedGameInfo
            key={cg.id}
            cachedGame={cg}
            onRemoved={() => onRemoved(cg.id)}
          />
        ))}
      </ul>
    </>
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const [cachedGames, setCachedGames] = React.useState<CachedGame[]>([]);

  // clientLoader runs after hydration, so sync its result into state.
  React.useEffect(() => {
    if ("cachedGames" in loaderData) {
      setCachedGames(loaderData.cachedGames);
    }
  }, [loaderData]);

  function handleRemoved(gameId: string) {
    setCachedGames((prev) => prev.filter((g) => g.id !== gameId));
  }

  // Offline-only render: show downloaded games only
  if ("offline" in loaderData && loaderData.offline) {
    return (
      <div className="max-w-full grow">
        <Main>
          <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
          <OfflineIndicator />
          <DownloadedGamesSection
            cachedGames={cachedGames}
            onRemoved={handleRemoved}
          />
        </Main>
      </div>
    );
  }

  // Online render
  if (isOnlineLoaderData(loaderData)) {
    return (
      <OnlineProfile
        loaderData={loaderData}
        cachedGames={cachedGames}
        onRemoved={handleRemoved}
      />
    );
  }

  return null;
}

function OnlineProfile({
  loaderData,
  cachedGames,
  onRemoved,
}: {
  loaderData: OnlineLoaderData;
  cachedGames: CachedGame[];
  onRemoved: (gameId: string) => void;
}) {
  const patchGame = useFetcher<never>();
  const uploadGame = useFetcher<never>();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [formState, setFormState] = React.useState(loaderData.formState);

  React.useEffect(() => {
    if (patchGame.state === "submitting") {
      setFormState(undefined);
    }
  }, [patchGame.state]);

  React.useEffect(() => {
    if (uploadGame.state === "submitting") {
      setFormState(undefined);
    }
  }, [uploadGame.state]);

  const loaderFormState = loaderData.formState;
  React.useEffect(() => {
    setFormState(loaderFormState);

    if (loaderFormState?.success) {
      const handler = window.setTimeout(() => {
        setFormState(undefined);
      }, 5000);
      return () => window.clearTimeout(handler);
    }
  }, [loaderFormState]);

  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
        <OfflineIndicator />
        <p className="mb-4">{loaderData.user?.email}</p>

        <DownloadedGamesSection
          cachedGames={cachedGames}
          onRemoved={onRemoved}
        />

        <h2 className="mb-2 text-2xl font-semibold">Settings</h2>
        <p className="mb-4 text-sm text-slate-500">
          Apply these settings across all games.
        </p>
        <div className="mb-6 flex flex-col gap-4">
          <SoundControl />
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
