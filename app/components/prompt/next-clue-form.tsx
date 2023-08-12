import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatDollars, formatDollarsWithSign } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

interface PlayerScore {
  name: string;
  correct: boolean;
  value: number;
  score: number;
}

function PlayerScores({
  answerers,
  boardControlName,
  wagerable,
  longForm,
}: {
  answerers: PlayerScore[];
  boardControlName: string;
  wagerable: boolean;
  longForm: boolean;
}) {
  if (!answerers.length) {
    if (wagerable && longForm) {
      return (
        <p className="font-bold text-white">
          No one has enough money to wager on this clue.
        </p>
      );
    } else if (wagerable) {
      return (
        <p className="font-bold text-white">
          {boardControlName} do(es) not have enough money to wager on this clue.
        </p>
      );
    } else {
      return <p className="font-bold text-white">No one won the clue.</p>;
    }
  }
  return (
    <div className="flex gap-2">
      {answerers.map(({ name, correct, value, score }, i) => (
        <p className="text-shadow text-center font-bold text-white" key={i}>
          <span className="font-handwriting text-xl">{name} </span>
          <span
            className={classNames("font-impact", {
              "text-green-300": correct,
              "text-red-300": !correct,
            })}
          >
            {formatDollarsWithSign(correct ? value : -1 * value)}
          </span>
          <br />
          <span className="font-impact text-xl">{formatDollars(score)}</span>
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
  answerers: PlayerScore[];
  wagerable: boolean;
  longForm: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <PlayerScores
        answerers={answerers}
        boardControlName={boardControlName}
        wagerable={wagerable}
        longForm={longForm}
      />
      {cluesLeftInRound ? (
        <p className="text-sm text-slate-300">
          {boardControlName} will choose the next clue.
        </p>
      ) : null}
      <Button type="primary" htmlType="submit" autoFocus loading={loading}>
        Back to board
      </Button>
    </div>
  );
}

export function ConnectedNextClueForm({ roomId, userId }: RoomProps) {
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

  if (!activeClue || !clue) {
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
      score: player.score,
      value: getClueValue(activeClue, player.userId),
    }))
    .filter((p): p is PlayerScore => p.correct !== undefined);

  return (
    <fetcher.Form method="POST" action={`/room/${roomId}/next-clue`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClueForm
        boardControlName={boardControlName}
        cluesLeftInRound={numCluesLeftInRound}
        loading={loading}
        answerers={answerers}
        wagerable={clue.wagerable ?? false}
        longForm={clue.longForm ?? false}
      />
    </fetcher.Form>
  );
}
