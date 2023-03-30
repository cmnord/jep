import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";

const formatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0, // Round to whole dollars.
  signDisplay: "always", // Show +/- for positive and negative values.
});

function PlayerScores({
  answerers,
}: {
  answerers: { name: string; correct: boolean; value: number }[];
}) {
  if (!answerers.length) {
    return <p className="text-slate-300 text-sm">No one won the clue.</p>;
  }
  return (
    <div className="flex gap-2">
      {answerers.map(({ name, correct, value }, i) => (
        <p className="text-white font-bold" key={i}>
          <span className="font-handwriting text-xl">{name} </span>
          <span
            className={classNames("text-shadow", {
              "text-green-300": correct,
              "text-red-300": !correct,
            })}
          >
            {formatter.format(correct ? value : -1 * value)}
          </span>
        </p>
      ))}
    </div>
  );
}

function NextClueForm({
  boardControlName,
  cluesLeftInRound,
  loading,
  answerers,
}: {
  boardControlName: string;
  cluesLeftInRound: number;
  loading: boolean;
  answerers: { name: string; correct: boolean; value: number }[];
}) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <PlayerScores answerers={answerers} />
      {cluesLeftInRound ? (
        <p className="text-slate-300 text-sm">
          {boardControlName} will choose the next clue.
        </p>
      ) : null}
      <Button htmlType="submit" type="primary" autoFocus loading={loading}>
        Back to board
      </Button>
    </div>
  );
}

export function ConnectedNextClueForm({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const {
    activeClue,
    answeredBy,
    getClueValue,
    players,
    boardControl,
    numCluesLeftInRound,
    soloDispatch,
  } = useEngineContext();

  if (!activeClue) {
    throw new Error("No active clue");
  }

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.userId === userId
      ? "You"
      : boardController.name
    : "Unknown player";

  const [i, j] = activeClue;

  const answerers = Array.from(players.values())
    .map((player) => ({
      name: player.name,
      correct: answeredBy(i, j, player.userId),
      value: getClueValue(activeClue, player.userId),
    }))
    .filter(
      (p): p is { name: string; correct: boolean; value: number } =>
        p.correct !== undefined
    );

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/next-clue`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClueForm
        boardControlName={boardControlName}
        cluesLeftInRound={numCluesLeftInRound}
        loading={loading}
        answerers={answerers}
      />
    </fetcher.Form>
  );
}
