import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";
import { formatDollarsWithSign } from "~/utils/utils";

function PlayerScores({
  answerers,
  boardControlName,
  wagerable,
  longForm,
}: {
  answerers: { name: string; correct: boolean; value: number }[];
  boardControlName: string;
  wagerable: boolean;
  longForm: boolean;
}) {
  if (!answerers.length) {
    if (wagerable && longForm) {
      return (
        <p className="text-white font-bold">
          No one has enough money to wager on this clue.
        </p>
      );
    } else if (wagerable) {
      return (
        <p className="text-white font-bold">
          {boardControlName} do(es) not have enough money to wager on this clue.
        </p>
      );
    } else {
      return <p className="text-white font-bold">No one won the clue.</p>;
    }
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
            {formatDollarsWithSign(correct ? value : -1 * value)}
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
  wagerable,
  longForm,
}: {
  boardControlName: string;
  cluesLeftInRound: number;
  loading: boolean;
  answerers: { name: string; correct: boolean; value: number }[];
  wagerable: boolean;
  longForm: boolean;
}) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <PlayerScores
        answerers={answerers}
        boardControlName={boardControlName}
        wagerable={wagerable}
        longForm={longForm}
      />
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
    clue,
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
    <fetcher.Form method="POST" action={`/room/${roomName}/next-clue`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClueForm
        boardControlName={boardControlName}
        cluesLeftInRound={numCluesLeftInRound}
        loading={loading}
        answerers={answerers}
        wagerable={clue?.wagerable ?? false}
        longForm={clue?.longForm ?? false}
      />
    </fetcher.Form>
  );
}
