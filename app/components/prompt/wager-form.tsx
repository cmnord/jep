import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import Input from "~/components/input";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  getHighestClueValue,
  useEngineContext,
} from "~/engine";
import { formatDollars } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

type PlayerAndCanWager = Player & { canWager: boolean; hasWager: boolean };

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
    <div className="flex w-full gap-2 self-start overflow-x-scroll text-sm text-slate-300 text-shadow">
      {playerScores.map((p, i) => (
        <div
          className="relative flex flex-col items-center justify-between"
          key={`player-${i}`}
        >
          <p className="text-center">
            <span className="font-handwriting text-xl font-bold">{p.name}</span>
            {p.userId === userId ? <span> (you)</span> : null}
            {p.canWager ? (
              <span className="ml-1"> {p.hasWager ? "☑️" : "💭"}</span>
            ) : (
              <span> (can't wager)</span>
            )}
          </p>
          <p className="text-white">{formatDollars(p.score)}</p>
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
    <div className="flex flex-col items-center gap-4 p-2">
      <div className="flex w-full flex-col items-center gap-2">
        <p className="font-bold text-white">
          How much will you wager on this clue?
        </p>
        <p className="text-center text-sm text-slate-300">
          You can wager up to {formatDollars(maxWager)}.
        </p>
        <PlayerScores players={players} userId={userId} />
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min={longForm ? 0 : 5}
          max={maxWager}
          id="wager"
          name="wager"
          className={`min-w-48 font-handwriting text-xl font-bold placeholder:font-sans placeholder:font-normal`}
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
        <span className="font-xl font-handwriting font-bold">
          {formatDollars(maxWager)}
        </span>
      </Button>
    </div>
  );
}

export function ConnectedWagerForm({ roomId, userId }: RoomProps) {
  const { activeClue, buzzes, board, clue, players, soloDispatch, wagers } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const [i, j] = activeClue ? activeClue : [-1, -1];

  const score = players.get(userId)?.score ?? 0;

  const highestClueValue = React.useMemo(
    () => getHighestClueValue(board),
    [board],
  );

  const wager = wagers.get(userId);
  const playersList = Array.from(players.values()).map((p) => ({
    ...p,
    canWager: buzzes.get(p.userId) !== CANT_BUZZ_FLAG,
    hasWager: wagers.has(p.userId),
  }));

  if (wager !== undefined) {
    return (
      <div className="flex flex-col items-center gap-4 p-2">
        <p className="font-bold text-white">
          Your wager:{" "}
          <span className="font-handwriting text-xl">
            {formatDollars(wager)}
          </span>
          <br />
        </p>
        <p className="text-sm text-slate-300">
          Waiting for other players to wager...
        </p>
        <PlayerScores players={playersList} userId={userId} />
      </div>
    );
  }

  return (
    <fetcher.Form method="POST" action={`/room/${roomId}/wager`}>
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
