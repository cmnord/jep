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

function NextClue({
  boardControlName,
  buzzCorrect,
  cluesLeftInRound,
  clueValue,
  loading,
  winningBuzzer,
}: {
  boardControlName: string;
  buzzCorrect: boolean;
  cluesLeftInRound: number;
  clueValue: number;
  loading: boolean;
  winningBuzzer?: string;
}) {
  const value = buzzCorrect ? clueValue : -1 * clueValue;

  return (
    <div className="p-2 flex flex-col items-center gap-2">
      {winningBuzzer ? (
        <p className="text-white font-bold">
          {winningBuzzer}{" "}
          <span
            className={classNames("text-shadow", {
              "text-green-300": buzzCorrect,
              "text-red-300": !buzzCorrect,
            })}
          >
            {formatter.format(value)}
          </span>
        </p>
      ) : (
        <p className="text-slate-300 text-sm">No one won the clue.</p>
      )}
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

export function NextClueForm({
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
    winningBuzzer,
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
  const buzzCorrect = answeredBy(i, j) === winningBuzzer;
  const winningBuzzerName = winningBuzzer
    ? players.get(winningBuzzer)?.name
    : undefined;
  const clueValue = getClueValue(activeClue, userId);

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/next-clue`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClue
        boardControlName={boardControlName}
        cluesLeftInRound={numCluesLeftInRound}
        loading={loading}
        winningBuzzer={winningBuzzerName}
        buzzCorrect={buzzCorrect}
        clueValue={clueValue}
      />
    </fetcher.Form>
  );
}
