import type { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PlayerScore } from "~/components/player";

import { applyRoomEventsToState, isTypedRoomEvent } from "~/engine/room-event";
import { stateFromGame } from "~/engine/state";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { BASE_URL } from "~/utils";

import ScoreChart from "./chart";
import GameSummary from "./summary";

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: "Summary: " + data?.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader({ request, params }: LoaderArgs) {
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const roomId = parseInt(roomName.split("-")[0]);
  const room = await getRoom(roomId);
  if (!room) {
    throw new Response("room not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const roomEvents = await getRoomEvents(room.id);

  return json({
    game,
    roomEvents,
    roomId,
    BASE_URL,
  });
}

export default function PlayGame() {
  const data = useLoaderData<typeof loader>();

  const state = applyRoomEventsToState(
    stateFromGame(data.game),
    data.roomEvents,
  );

  const sortedPlayers = Array.from(state.players.values()).sort(
    (a, b) => b.score - a.score,
  );
  const maxScore = sortedPlayers[0].score;
  const winningPlayers = sortedPlayers
    .filter((p) => p.score === maxScore)
    .map((p) => p.name);

  return (
    <div className="flex grow flex-col bg-slate-900 text-white">
      <div
        className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3
          text-slate-100 sm:p-6 md:p-12`}
      >
        <h2 className="text-2xl">Congrats, {winningPlayers.join(" and ")}!</h2>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {sortedPlayers.map((p) => (
            <PlayerScore
              key={p.userId}
              player={p}
              hasBoardControl={false}
              winning={p.score === maxScore}
            />
          ))}
        </div>
        <ScoreChart
          game={data.game}
          state={state}
          roomEvents={data.roomEvents.filter(isTypedRoomEvent)}
        />
      </div>
      <GameSummary game={data.game} state={state} />
    </div>
  );
}
