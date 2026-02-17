import * as Collapsible from "@radix-ui/react-collapsible";
import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import Input from "~/components/input";
import Popover from "~/components/popover";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  getHighestClueValue,
  useEngineContext,
} from "~/engine";
import { formatDollars } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";
import { useWagerHintsContext } from "~/utils/use-wager-hints";
import type { WagerRecommendation } from "~/utils/wager-strategy";
import { getFinalClueStrategy } from "~/utils/wager-strategy";

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

function WhyButton({ reason }: { reason: string }) {
  return (
    <Popover content={<p>{reason}</p>}>
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs text-slate-400 transition-colors hover:border-white hover:text-white"
      >
        ?
      </button>
    </Popover>
  );
}

function SuggestedDrawer({
  allInReason,
  recommendations,
  onSelectAmount,
  defaultOpen,
}: {
  allInReason?: string;
  recommendations: WagerRecommendation[];
  onSelectAmount: (amount: number) => void;
  defaultOpen: boolean;
}) {
  const totalCount =
    recommendations.length + (allInReason ? 1 : 0);
  if (totalCount === 0) return null;

  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="w-full">
      <Collapsible.Trigger className="group flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-white">
        <span>Suggestions</span>
        <span className="rounded-full bg-slate-700 px-1.5 text-xs text-slate-400">
          {totalCount}
        </span>
        <span className="text-xs transition-transform group-data-[state=open]:rotate-90">
          ›
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className="flex flex-wrap items-center gap-2 pt-2">
        {allInReason ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-300">All-in</span>
            <WhyButton reason={allInReason} />
          </div>
        ) : null}
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-center gap-1">
            <Button
              type="primary"
              onClick={() => onSelectAmount(rec.amount)}
            >
              {rec.label}:{" "}
              <span className="font-handwriting font-bold">
                {formatDollars(rec.amount)}
              </span>
            </Button>
            <WhyButton reason={rec.reason} />
          </div>
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function WagerForm({
  highestClueValue,
  score,
  loading,
  longForm,
  players,
  userId,
  strategy,
  wagerHints,
}: {
  highestClueValue: number;
  score: number;
  loading: boolean;
  longForm: boolean;
  players: PlayerAndCanWager[];
  userId: string;
  strategy?: { recommendations: WagerRecommendation[] };
  wagerHints: string;
}) {
  const maxWager = longForm ? score : Math.max(score, highestClueValue);
  const [wagerValue, setWagerValue] = React.useState("");

  // Split recommendations: All-in reason vs other chips
  const allInRec = strategy?.recommendations.find((r) => r.amount === maxWager);
  const otherRecs = React.useMemo(() => {
    if (!strategy) return [];
    return strategy.recommendations.filter((r) => r.amount !== maxWager);
  }, [strategy, maxWager]);

  const hasAnySuggestion =
    (allInRec || otherRecs.length > 0) && wagerHints !== "never";

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

      {/* Input + submit row */}
      <div className="flex w-full items-center gap-2">
        <Input
          type="number"
          min={longForm ? 0 : 5}
          max={maxWager}
          id="wager"
          name="wager"
          value={wagerValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setWagerValue(e.target.value)
          }
          className="min-w-0 flex-1 font-handwriting text-xl font-bold placeholder:font-sans placeholder:font-normal"
          placeholder="amount"
          required
        />
        <Button type="default" htmlType="submit" loading={loading}>
          Place wager
        </Button>
      </div>

      {/* All-in button */}
      <Button
        type="primary"
        onClick={() => setWagerValue(maxWager.toString())}
      >
        All-in ({formatDollars(maxWager)})
      </Button>

      {/* Suggestions drawer */}
      {hasAnySuggestion ? (
        <SuggestedDrawer
          allInReason={allInRec?.reason}
          recommendations={otherRecs}
          onSelectAmount={(amount) => setWagerValue(amount.toString())}
          defaultOpen={wagerHints === "show"}
        />
      ) : null}
    </div>
  );
}

export function ConnectedWagerForm({ roomId, userId }: RoomProps) {
  const { activeClue, buzzes, board, clue, players, soloDispatch, wagers } =
    useEngineContext();
  const { wagerHints } = useWagerHintsContext();
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

  const longForm = clue?.longForm ?? false;

  const strategy = React.useMemo(() => {
    if (wagerHints === "never") return undefined;
    if (!longForm || score <= 0) return undefined;

    const otherScores = Array.from(players.values())
      .filter(
        (p) => p.userId !== userId && buzzes.get(p.userId) !== CANT_BUZZ_FLAG,
      )
      .map((p) => p.score);

    return getFinalClueStrategy(score, otherScores);
  }, [wagerHints, longForm, score, players, buzzes, userId]);

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
        longForm={longForm}
        strategy={strategy}
        wagerHints={wagerHints}
      />
    </fetcher.Form>
  );
}
