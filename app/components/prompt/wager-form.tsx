import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  getHighestClueValue,
  useEngineContext,
} from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
});

type PlayerAndCanWager = Player & { canWager: boolean };

function PlayerScores({
  players,
  userId,
}: {
  players: PlayerAndCanWager[];
  userId: string;
}) {
  // Sort from highest to lowest score.
  const playerScores = players.sort((a, b) => b.score - a.score);

  return (
    <div className="flex self-start gap-2 w-full overflow-x-scroll text-slate-300 text-sm text-shadow">
      {playerScores.map((p, i) => (
        <div
          className="flex flex-col items-center justify-between"
          key={`player-${i}`}
        >
          <p className="text-center">
            <span className="font-handwriting text-xl font-bold">{p.name}</span>
            <span>{p.userId === userId ? " (you)" : null}</span>
            {p.canWager ? null : <span> (can't wager)</span>}
          </p>
          <p className="text-white">{formatter.format(p.score)}</p>
        </div>
      ))}
    </div>
  );
}

function WagerForm({
  highestClueValue,
  score,
  loading,
  longForm,
  players,
  userId,
}: {
  highestClueValue: number;
  score: number;
  loading: boolean;
  longForm: boolean;
  players: PlayerAndCanWager[];
  userId: string;
}) {
  const maxWager = longForm ? score : Math.max(score, highestClueValue);

  const [inputRequired, setInputRequired] = React.useState(true);

  return (
    <div className="p-2 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-white font-bold">
          How much will you wager on this clue?
        </p>
        <p className="text-slate-300 text-sm text-center">
          You can wager up to {formatter.format(maxWager)}.
        </p>
        <PlayerScores players={players} userId={userId} />
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={5}
          max={maxWager}
          id="wager"
          name="wager"
          className={
            "px-4 min-w-48 text-xl font-handwriting font-bold text-slate-900 border border-slate-300 rounded-lg bg-slate-50 " +
            "focus:ring-blue-500 focus:border-blue-500 " +
            "placeholder:font-sans placeholder:text-sm placeholder:font-normal"
          }
          placeholder="choose wager amount"
          required={inputRequired}
        />
        <Button
          type="default"
          htmlType="submit"
          loading={loading}
          onClick={() => setInputRequired(true)}
        >
          submit
        </Button>
      </div>
      <Button
        type="primary"
        htmlType="submit"
        name="full"
        value={maxWager.toString()}
        loading={loading}
        onClick={() => setInputRequired(false)}
      >
        Wager all:
        <span className="font-handwriting font-xl font-bold">
          {formatter.format(maxWager)}
        </span>
      </Button>
    </div>
  );
}

export function ConnectedWagerForm({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { activeClue, buzzes, board, clue, players, soloDispatch, wagers } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const [i, j] = activeClue ? activeClue : [-1, -1];

  const score = players.get(userId)?.score ?? 0;

  const highestClueValue = React.useMemo(
    () => getHighestClueValue(board),
    [board]
  );

  const wager = wagers.get(userId);
  const playersList = Array.from(players.values()).map((p) => ({
    ...p,
    canWager: buzzes.get(p.userId) !== CANT_BUZZ_FLAG,
  }));

  if (wager !== undefined) {
    return (
      <div className="p-2 flex flex-col items-center gap-4">
        <p className="text-white font-bold">
          Your wager:{" "}
          <span className="font-handwriting text-xl">
            {formatter.format(wager)}
          </span>
          <br />
        </p>
        <p className="text-slate-300 text-sm">
          Waiting for other players to wager...
        </p>
        <PlayerScores players={playersList} userId={userId} />
      </div>
    );
  }

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/wager`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <WagerForm
        highestClueValue={highestClueValue}
        loading={loading}
        players={playersList}
        score={score}
        userId={userId}
        longForm={clue?.longForm ?? false}
      />
    </fetcher.Form>
  );
}
