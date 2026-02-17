import * as React from "react";
import { data, useMatches } from "react-router";

import GameComponent from "~/components/game";
import ResumePrompt from "~/components/resume-prompt";
import {
  ActionType,
  GameEngineContext,
  GameState,
  useSoloGameEngine,
} from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { BASE_URL, getRandomEmoji } from "~/utils";
import {
  cacheGame,
  deleteSavedSoloState,
  deserializeState,
  getCachedGame,
  getSavedSoloState,
} from "~/utils/offline-storage";

import type { Route } from "./+types/game_.$gameId.solo";

export const meta: Route.MetaFunction = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const gameId = params.gameId;

  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(gameId, authSession?.userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const user = authSession
    ? await getUserByEmail(authSession.email, authSession.accessToken)
    : null;

  const name = getRandomEmoji();

  // Add the user to the room. If they are logged in, their ID is their user ID.
  // If they are a guest, their ID is their guest session ID.
  if (user) {
    return { game, userId: user.id, name, BASE_URL };
  } else {
    const headers = new Headers();
    const userId = await getOrCreateUserSession(request, headers);
    return data({ game, userId, name, BASE_URL }, { headers });
  }
}

export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs) {
  const gameId = params.gameId;
  if (!gameId) {
    throw new Response("game ID not found", { status: 404 });
  }

  try {
    const serverData = await serverLoader();

    // Cache game data for offline use (fire-and-forget)
    void cacheGame({
      id: gameId,
      game: serverData.game,
      title: serverData.game.title,
      author: serverData.game.author,
      cachedAt: Date.now(),
    }).catch((error) => {
      console.warn("Failed to cache game for offline use", error);
    });

    return serverData;
  } catch {
    // Offline — try IndexedDB fallback
    const cached = await getCachedGame(gameId);
    if (!cached) {
      throw new Response(
        "Game not available offline. Play it once while online to cache it.",
        { status: 503 },
      );
    }

    const OFFLINE_USER_KEY = "jep-offline-userId";
    let userId = localStorage.getItem(OFFLINE_USER_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(OFFLINE_USER_KEY, userId);
    }

    return {
      game: cached.game,
      userId,
      name: getRandomEmoji(),
      BASE_URL: window.location.origin,
    };
  }
}
clientLoader.hydrate = true as const;

export default function SoloGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;
  const { game, userId, name: loaderName, BASE_URL: baseUrl } = loaderData;
  const [name, setName] = React.useState(loaderName);

  // The game from the server loader has `id`, but the offline cached game
  // (from convert.server.Game) may not. Use the route param as fallback.
  const gameId =
    "id" in game && typeof game.id === "string"
      ? game.id
      : pathname.split("/")[2];

  const persistenceConfig = React.useMemo(
    () => ({ gameId, userId, name }),
    [gameId, userId, name],
  );
  const gameReducer = useSoloGameEngine(game, persistenceConfig);

  // Resume / New Game prompt
  const [showResume, setShowResume] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    getSavedSoloState(gameId)
      .then((saved) => {
        setShowResume(saved != null);
      })
      .catch(() => setShowResume(false));
  }, [gameId]);

  function handleResume() {
    getSavedSoloState(gameId)
      .then((saved) => {
        if (saved) {
          setName(saved.name);
          const restored = deserializeState(saved.state, game);
          gameReducer.soloDispatch?.({
            type: ActionType.Restore,
            payload: restored,
            ts: Date.now(),
          });
        }
        setShowResume(false);
      })
      .catch(() => setShowResume(false));
  }

  function handleNewGame() {
    deleteSavedSoloState(gameId).catch(() => {});
    setShowResume(false);
  }

  // Clear saved state on game over
  React.useEffect(() => {
    if (gameReducer.type === GameState.GameOver) {
      deleteSavedSoloState(gameId).catch(() => {});
    }
  }, [gameReducer.type, gameId]);

  // Wait for resume check to complete
  if (showResume === null) {
    return <div className="flex-grow bg-blue-1000" />;
  }
  const resumeGateActive = showResume === true;

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={game}
        name={name}
        roomId={-1}
        roomName="-1-solo"
        suppressDialogs={resumeGateActive}
        userId={userId}
        url={baseUrl + pathname}
      />
      {resumeGateActive ? (
        <ResumePrompt onResume={handleResume} onNewGame={handleNewGame} />
      ) : null}
    </GameEngineContext.Provider>
  );
}
