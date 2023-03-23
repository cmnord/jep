import { useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";

function NextClue({
  boardControlName,
  cluesLeftInRound,
  loading,
}: {
  boardControlName: string;
  cluesLeftInRound: number;
  loading: boolean;
}) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
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
  clueIdx,
}: {
  roomName: string;
  userId: string;
  clueIdx?: [number, number];
}) {
  const { players, boardControl, numAnswered, numCluesInBoard, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.userId === userId
      ? "You"
      : boardController.name
    : "Unknown player";

  const cluesLeftInRound = numCluesInBoard - numAnswered;

  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/next-clue`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClue
        boardControlName={boardControlName}
        cluesLeftInRound={cluesLeftInRound}
        loading={loading}
      />
    </fetcher.Form>
  );
}
