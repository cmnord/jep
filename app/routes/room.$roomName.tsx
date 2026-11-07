import * as React from "react";
import { data, redirect, useMatches, useRevalidator } from "react-router";
import { ENV } from "varlock/env";

import { getAdmin } from "~/admin/auth.server";
import GameComponent from "~/components/game";
import { ActionType, GameEngineContext, useGameEngine } from "~/engine";
import type { PresenceRole } from "~/engine/presence";
import { applyRoomEventsToState } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import {
  createRoomEventAsServer,
  getRoomEvents,
} from "~/models/room-event.server";
import { getRoomByName } from "~/models/room.server";
import { getUserByEmail } from "~/models/user";
import { parseUserSettings } from "~/models/user-settings";
import {
  getAnswerToReveal,
  revealPayload,
  shouldWithholdAnswers,
  withholdAnswers,
} from "~/models/withhold-answers";
import { getOrCreateUserSession, getUserSession } from "~/session.server";
import { getRandomEmoji } from "~/utils";
import { noteServerTime } from "~/utils/server-clock";

import type { Route } from "./+types/room.$roomName";

export const meta: Route.MetaFunction = ({ loaderData }) => {
  try {
    return [{ title: loaderData?.game.title }];
  } catch {
    return [];
  }
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const t = createT(getRequestLocale(request));
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response(t("room.error.noRoomInUrl"), { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const room = await getRoomByName(roomName, authSession?.accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }
  const roomId = room.id;

  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }

  const user = authSession
    ? await getUserByEmail(authSession.email, authSession.accessToken)
    : null;
  const accessToken = authSession?.accessToken;

  let roomEvents = await getRoomEvents(room.id, accessToken);
  const gameDefaults = user
    ? parseUserSettings(user.settings).gameDefaults
    : undefined;
  const name = gameDefaults?.playerName ?? getRandomEmoji();
  const playerColor = gameDefaults?.playerColor;

  let state = applyRoomEventsToState(stateFromGame(game), roomEvents);
  // Host mode (feature 22): a question resolved without its reveal (e.g. the
  // route's reveal failed) gets it now, so players see the answer.
  const reveal = getAnswerToReveal(state);
  if (reveal) {
    await createRoomEventAsServer(
      room.id,
      ActionType.RevealAnswer,
      revealPayload(reveal),
    );
    roomEvents = await getRoomEvents(room.id, accessToken);
    state = applyRoomEventsToState(stateFromGame(game), roomEvents);
  }
  // Only whether the visitor is the site admin (may change the answer
  // timer), never anything about the admin session itself.
  const isAdmin = (await getAdmin(request)) !== null;

  if (state.type === GameState.GameOver) {
    return redirect(`/room/${roomName}/summary`);
  }

  /** The game as this visitor may see it: in host mode only the host and
   * the admin get the answers of unresolved questions. */
  const gameFor = (userId: string) => {
    const answersHidden = shouldWithholdAnswers(state, userId, isAdmin);
    return {
      game: answersHidden ? withholdAnswers(game, state) : game,
      answersHidden,
    };
  };

  if (user) {
    const userId = user.id;

    // Check if this authenticated user was previously playing as an anonymous
    // guest. If so, transfer the anonymous player to their authenticated
    // identity so they keep their score and participation. If the
    // authenticated user is already in the game too, the anonymous player is
    // retired to leftPlayers so it doesn't block the game.
    const anonymousUserId = await getUserSession(request);
    if (
      anonymousUserId &&
      anonymousUserId !== userId &&
      state.players.has(anonymousUserId)
    ) {
      // With the service role: the browser key may not insert
      // transfer_player events (RLS), so nobody can move someone else's
      // seat to themselves; here both ids come from this visitor's sessions.
      await createRoomEventAsServer(room.id, ActionType.TransferPlayer, {
        oldUserId: anonymousUserId,
        newUserId: userId,
      });
      // Re-fetch room events to include the transfer.
      const updatedRoomEvents = await getRoomEvents(room.id, accessToken);
      return {
        ...gameFor(userId),
        name,
        playerColor,
        roomEvents: updatedRoomEvents,
        roomId,
        roomName,
        userId,
        BASE_URL: ENV.BASE_URL,
        serverNow: Date.now(),
        accessToken,
        isAdmin,
      };
    }

    return {
      ...gameFor(userId),
      name,
      playerColor,
      roomEvents,
      roomId,
      roomName,
      userId,
      BASE_URL: ENV.BASE_URL,
      serverNow: Date.now(),
      accessToken,
      isAdmin,
    };
  }

  const headers = new Headers();
  const userId = await getOrCreateUserSession(request, headers);
  return data(
    {
      ...gameFor(userId),
      name,
      playerColor,
      roomEvents,
      roomId,
      roomName,
      accessToken,
      userId,
      BASE_URL: ENV.BASE_URL,
      serverNow: Date.now(),
      isAdmin,
    },
    { headers },
  );
}

export default function PlayGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  // "Just watch": the visitor closed the join dialog without joining.
  const [watching, setWatching] = React.useState(false);
  // Announced with Realtime presence so the room can show how many people
  // watch. It depends on the engine's players, so it follows them one render
  // later.
  const [presence, setPresence] = React.useState<PresenceRole | null>(null);

  // Spectators say who they are (the admin may make one the host). The name
  // is the one the visitor got when the page loaded (guests get a random
  // one per load), so revalidations don't re-announce it.
  const [identity] = React.useState(() => ({
    userId: loaderData.userId,
    name: loaderData.name,
  }));
  const engine = useGameEngine(
    loaderData.game,
    loaderData.roomEvents,
    loaderData.roomId,
    loaderData.accessToken,
    presence,
    {
      answersHidden: loaderData.answersHidden,
      presenceIdentity: identity,
    },
  );

  // Host mode (feature 22): when the host seat changes, the answers this
  // page may have change too — fetch the game again (once per seat change).
  const hideAnswers = shouldWithholdAnswers(
    engine,
    loaderData.userId,
    loaderData.isAdmin,
  );
  const revalidator = useRevalidator();
  const revalidatedFor = React.useRef<string | null>(null);
  const hostKey = engine.host?.userId ?? "";
  React.useEffect(() => {
    if (hideAnswers === loaderData.answersHidden) {
      revalidatedFor.current = null;
      return;
    }
    if (revalidatedFor.current === hostKey) return;
    revalidatedFor.current = hostKey;
    void revalidator.revalidate();
  }, [hideAnswers, loaderData.answersHidden, hostKey, revalidator]);

  // The server's time when the loader ran: a sample for the server clock
  // estimate (answer timer), e.g. for a reload in the middle of a turn.
  React.useEffect(() => {
    noteServerTime(loaderData.serverNow);
  }, [loaderData.serverNow]);

  const isPlayer = engine.players.has(loaderData.userId);
  const isHost = engine.host?.userId === loaderData.userId;
  const role: PresenceRole | null = isPlayer
    ? "player"
    : isHost
      ? "host"
      : watching
        ? "spectator"
        : null;
  React.useEffect(() => setPresence(role), [role]);

  return (
    <GameEngineContext.Provider value={engine}>
      <GameComponent
        game={loaderData.game}
        isAdmin={loaderData.isAdmin}
        name={loaderData.name}
        playerColor={loaderData.playerColor}
        roomId={loaderData.roomId}
        roomName={loaderData.roomName}
        userId={loaderData.userId}
        url={loaderData.BASE_URL + pathname}
        watching={watching}
        onWatchingChange={setWatching}
      />
    </GameEngineContext.Provider>
  );
}
