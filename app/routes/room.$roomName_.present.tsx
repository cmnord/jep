import * as React from "react";
import { useRevalidator } from "react-router";
import { ENV } from "varlock/env";

import { Presenter } from "~/components/watch/presenter";
import { GameEngineContext, useGameEngine } from "~/engine";
import { applyRoomEventsToState } from "~/engine/room-event";
import { stateFromGame } from "~/engine/state";
import { createT, getRequestLocale } from "~/i18n";
import { metaT } from "~/i18n/meta";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getRoomEvents } from "~/models/room-event.server";
import { getRoomByName } from "~/models/room.server";
import {
  shouldWithholdAnswers,
  withholdAnswers,
} from "~/models/withhold-answers";
import { noteServerTime } from "~/utils/server-clock";

import type { Route } from "./+types/room.$roomName_.present";

/** The TV screen has no site header or footer (see root.tsx). */
export const handle = { chromeless: true };

export const meta: Route.MetaFunction = ({ loaderData, matches }) => {
  if (!loaderData) return [];
  return [
    {
      title: metaT(matches)("watch.presenterTitle", {
        title: loaderData.game.title,
      }),
    },
  ];
};

/** The presenter (TV) view of a room: /room/:roomName/present. It only reads
 * the room — no session cookie, no join, and it stays on the game-over
 * screen instead of redirecting to the summary. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const t = createT(getRequestLocale(request));
  const roomName = params.roomName;
  const authSession = await getValidAuthSession(request);
  const accessToken = authSession?.accessToken;
  const room = await getRoomByName(roomName, accessToken);
  if (!room) {
    throw new Response(t("room.error.roomNotFound"), { status: 404 });
  }
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response(t("room.error.gameNotFound"), { status: 404 });
  }
  const roomEvents = await getRoomEvents(room.id, accessToken);
  // Host mode (feature 22): the TV shows the room to everyone, so it never
  // gets the answers of unresolved questions (they arrive with the reveal).
  const state = applyRoomEventsToState(stateFromGame(game), roomEvents);
  const answersHidden = shouldWithholdAnswers(state, null, false);
  return {
    game: answersHidden ? withholdAnswers(game, state) : game,
    answersHidden,
    roomEvents,
    roomId: room.id,
    accessToken,
    serverNow: Date.now(),
    // Phones scan this to open the room and join.
    joinUrl: `${ENV.BASE_URL}/room/${roomName}`,
  };
}

export default function PresentRoom({ loaderData }: Route.ComponentProps) {
  const engine = useGameEngine(
    loaderData.game,
    loaderData.roomEvents,
    loaderData.roomId,
    loaderData.accessToken,
    "presenter",
    { answersHidden: loaderData.answersHidden },
  );
  // The host seat changed: fetch the game with (or without) the answers.
  const hideAnswers = shouldWithholdAnswers(engine, null, false);
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
  // A sample for the server clock estimate (answer timer).
  React.useEffect(() => {
    noteServerTime(loaderData.serverNow);
  }, [loaderData.serverNow]);
  return (
    <GameEngineContext.Provider value={engine}>
      <Presenter game={loaderData.game} joinUrl={loaderData.joinUrl} />
    </GameEngineContext.Provider>
  );
}
