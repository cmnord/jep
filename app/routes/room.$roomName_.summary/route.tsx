import { PlayerScore } from "~/components/player";
import type { Route } from "./+types/route";

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

export const meta: Route.MetaFunction = ({ data }) => {
  try {
    return [{ title: "Summary: " + data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader({ request, params }: Route.LoaderArgs) {
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

  const sortedPlayers = [...state.players.values()].sort(
    (a, b) => b.score - a.score,
  );
  const sortedLeftPlayers = [...state.leftPlayers.values()].sort(
    (a, b) => b.score - a.score,
  );
  const allSorted = [...sortedPlayers, ...sortedLeftPlayers];
  const coryats = allSorted.map((player) => getCoryat(player.userId, state));
  const combinedCoryat = coryats.reduce((acc, coryat) => acc + coryat, 0);
  const battingAverages = allSorted.map((player) =>
    getBattingAverage(player.userId, state),
  );

  return {
    sortedPlayers,
    sortedLeftPlayers,
    battingAverages,
    coryats,
    combinedCoryat,
    game,
    roomEvents,
    roomId,
    BASE_URL,
  };
}

export default function PlayGame({ loaderData }: Route.ComponentProps) {
  const state = applyRoomEventsToState(
    stateFromGame(loaderData.game),
    loaderData.roomEvents,
  );

  const maxScore = loaderData.sortedPlayers.at(0)?.score;
  const winningPlayers = loaderData.sortedPlayers
    .filter((p) => p.score === maxScore)
    .map((p) => p.name);

  const allSorted = [
    ...loaderData.sortedPlayers,
    ...loaderData.sortedLeftPlayers,
  ];
  const leftPlayerOffset = loaderData.sortedPlayers.length;

  return (
    <div className="flex grow flex-col bg-blue-1000 text-white">
      <div
        className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3 text-slate-100 sm:p-6 md:p-12`}
      >
        <h2 className="text-2xl">Congrats, {winningPlayers.join(" and ")}!</h2>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {loaderData.sortedPlayers.map((p) => (
            <PlayerScore
              key={p.userId}
              player={p}
              hasBoardControl={false}
              winning={p.score === maxScore}
            />
          ))}
        </div>
        {loaderData.sortedLeftPlayers.length > 0 && (
          <>
            <h3 className="text-lg text-slate-400">Left the game</h3>
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
              {loaderData.sortedLeftPlayers.map((p) => (
                <PlayerScore
                  key={p.userId}
                  player={p}
                  hasBoardControl={false}
                  winning={false}
                />
              ))}
            </div>
          </>
        )}
        <h3 className="text-lg">Coryat Scores</h3>
        <p>
          <strong>Combined: </strong>
          {formatDollars(loaderData.combinedCoryat)}
        </p>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {allSorted.map((p, i) => (
            <span key={p.userId}>
              {p.name}: {formatDollars(loaderData.coryats[i])}
              {i >= leftPlayerOffset && (
                <span className="text-slate-400"> (left)</span>
              )}
            </span>
          ))}
        </div>
        <h3 className="text-lg">Batting averages</h3>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
          {allSorted.map((p, i) => (
            <span key={p.userId}>
              {p.name}: {loaderData.battingAverages[i][0]} /{" "}
              {loaderData.battingAverages[i][1]}
              {i >= leftPlayerOffset && (
                <span className="text-slate-400"> (left)</span>
              )}
            </span>
          ))}
        </div>
        <ScoreChart
          game={loaderData.game}
          players={allSorted}
          roomEvents={loaderData.roomEvents.filter(isTypedRoomEvent)}
        />
      </div>
      <GameSummary game={loaderData.game} state={state} />
    </div>
  );
}
