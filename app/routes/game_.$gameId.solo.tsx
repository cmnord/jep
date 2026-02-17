import { data, useMatches } from "react-router";

import GameComponent from "~/components/game";
import { GameEngineContext, useSoloGameEngine } from "~/engine";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getUserByEmail } from "~/models/user";
import { getOrCreateUserSession } from "~/session.server";
import { BASE_URL, getRandomEmoji } from "~/utils";

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

/** SoloGame lets a single user play a game without others being able to join. If
 * they refresh the page, the game will reset.
 */
export default function SoloGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const gameReducer = useSoloGameEngine(loaderData.game);

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={loaderData.game}
        name={loaderData.name}
        roomId={-1}
        roomName="-1-solo"
        userId={loaderData.userId}
        url={loaderData.BASE_URL + pathname}
      />
    </GameEngineContext.Provider>
  );
}
