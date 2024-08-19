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
import { getBattingAverage, getCoryat } from "./coryat";
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
  const authSession = await getValidAuthSession(request);
  const userId = authSession?.userId;
  const accessToken = authSession?.accessToken;
  const room = await getRoom(roomId, accessToken);
  if (!room || room.name !== roomWord) {
    throw new Response("room not found", { status: 404 });
  }

  const game = await getGame(room.game_id, userId);
  if (!game) {
    throw new Response("game not found", { status: 404 });
  }

  const roomEvents = await getRoomEvents(room.id, accessToken);

  const state = applyRoomEventsToState(stateFromGame(game), roomEvents);
  if (userId) {
    if (state.type === GameState.GameOver && state.players.has(userId)) {
      const solve = await getSolve(userId, game.id, accessToken);
      if (solve && solve.solved_at === null) {
        await markSolved(userId, game.id, room.id, accessToken);
      }
    }
  }

  const sortedPlayers = Array.from(state.players.values()).sort(
    (a, b) => b.score - a.score,
  );
  const coryats = sortedPlayers.map((player) =>
    getCoryat(player.userId, state),
  );
  const combinedCoryat = coryats.reduce((acc, coryat) => acc + coryat, 0);
  const battingAverages = sortedPlayers.map((player) =>
    getBattingAverage(player.userId, state),
  );

  return json({
    sortedPlayers,
    battingAverages,
    coryats,
    combinedCoryat,
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

  const maxScore = data.sortedPlayers.at(0)?.score;
  const winningPlayers = data.sortedPlayers
    .filter((p) => p.score === maxScore)
    .map((p) => p.name);

  return (
    <div className="flex grow flex-col bg-blue-1000 text-white">
      <div
        className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3
          text-slate-100 sm:p-6 md:p-12`}
      >
        <h2 className="text-2xl">Congrats, {winningPlayers.join(" and ")}!</h2>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {data.sortedPlayers.map((p) => (
            <PlayerScore
              key={p.userId}
              player={p}
              hasBoardControl={false}
              winning={p.score === maxScore}
            />
          ))}
        </div>
        <h3 className="text-lg">Coryat Scores</h3>
        <p>
          <strong>Combined: </strong>
          {formatDollars(data.combinedCoryat)}
        </p>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {data.sortedPlayers.map((p, i) => (
            <span>
              {p.name}: {formatDollars(data.coryats[i])}
            </span>
          ))}
        </div>
        <h3 className="text-lg">Batting averages</h3>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {data.sortedPlayers.map((p, i) => (
            <span>
              {p.name}: {data.battingAverages[i][0]} /{" "}
              {data.battingAverages[i][1]}
            </span>
          ))}
        </div>
        <ScoreChart
          game={data.game}
          players={data.sortedPlayers}
          roomEvents={data.roomEvents.filter(isTypedRoomEvent)}
        />
      </div>
      <GameSummary game={data.game} state={state} />
    </div>
  );
}
