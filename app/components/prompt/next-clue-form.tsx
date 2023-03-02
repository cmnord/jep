import { useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import { useEngineContext } from "~/engine";

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
        <p className="text-white font-bold">
          {boardControlName} will choose the next clue.
        </p>
      ) : null}
      <p className="text-gray-300 text-sm text-center">
        Click "OK" to return to the board for all players.
      </p>
      <Button htmlType="submit" type="primary" autoFocus loading={loading}>
        OK
      </Button>
    </div>
  );
}

export function NextClueForm({
  roomName,
  userId,
  i,
  j,
}: {
  roomName: string;
  userId: string;
  i: number;
  j: number;
}) {
  const { players, boardControl, numAnswered, numCluesInBoard } =
    useEngineContext();
  const fetcher = useFetcher();
  const loading = fetcher.state === "loading";

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.userId === userId
      ? "You"
      : boardController.name
    : "Unknown player";

  const cluesLeftInRound = numCluesInBoard - numAnswered;

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
