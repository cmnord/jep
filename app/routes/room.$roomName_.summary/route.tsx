import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PlayerScore } from "~/components/player";

import { applyRoomEventsToState, isTypedRoomEvent } from "~/engine/room-event";
import { GameState, stateFromGame } from "~/engine/state";
import { getValidAuthSession } from "~/models/auth";
import { getGame } from "~/models/game.server";
import { getRoomEvents } from "~/models/room-event.server";
import { getRoom } from "~/models/room.server";
import { BASE_URL, formatDollars } from "~/utils";

import { getSolve, markSolved } from "~/models/solves.server";
import ScoreChart from "./chart";
import { getCoryat } from "./coryat";
import GameSummary from "./summary";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  try {
    return [{ title: "Summary: " + data?.game.title }];
  } catch (error: unknown) {
    return [];
  }
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const roomName = params.roomName;
  if (!roomName) {
    throw new Response("room name not found in URL params", { status: 404 });
  }

  const roomParts = roomName.split("-");
  const roomId = parseInt(roomParts[0]);
  const roomWord = roomParts[1];
  const room = await getRoom(roomId);
  if (!room || room.name !== roomWord) {
    throw new Response("room not found", { status: 404 });
  }

  const authSession = await getValidAuthSession(request);
  const userId = authSession?.userId;
  const game = await getGame(room.game_id, authSession?.userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const roomEvents = await getRoomEvents(room.id);

  if (userId) {
    const state = applyRoomEventsToState(stateFromGame(game), roomEvents);
    if (state.type === GameState.GameOver && state.players.has(userId)) {
      const solve = await getSolve(userId, game.id, authSession?.accessToken);
      if (solve && solve.solved_at === null) {
        await markSolved(userId, game.id, room.id, authSession?.accessToken);
      }
    }
  }

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
  const maxScore = sortedPlayers.at(0)?.score;
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
        <h3 className="text-lg">Coryat Scores</h3>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {sortedPlayers.map((p) => (
            <span>
              {p.name}: {formatDollars(getCoryat(p.userId, state))}
            </span>
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
