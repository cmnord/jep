import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import { Dollars, DollarsDiff } from "~/components/dollars";
import type { RoomProps } from "~/components/game";
import {
  UndoArmingContext,
  UndoCheckButton,
  UndoCheckConfirm,
} from "~/components/undo-check";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import useSoloAction from "~/utils/use-solo-action";
import useTimeout from "~/utils/use-timeout";

const DEFAULT_COUNTDOWN_MS = 3000;

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
          {boardControlName} does not have enough money to wager on this clue.
        </p>
      );
    } else {
      return <p className="font-bold text-white">No one won the clue.</p>;
    }
  }
  return (
    <div className="flex gap-2">
      {answerers.map(({ name, correct, value, score }, i) => {
        return (
          <div className="relative" key={i}>
            <div className="flex flex-col items-center text-shadow" key={i}>
              <span className="font-handwriting text-xl font-bold text-slate-300">
                {name}
              </span>
              <Dollars amount={score} className="text-xl" />
            </div>
            <DollarsDiff
              amount={correct ? value : -1 * value}
              className="absolute -top-1/4 -right-1/2 animate-bounce whitespace-nowrap"
            />
          </div>
        );
      })}
    </div>
  );
}

export function ConnectedNextClueForm({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    answeredBy,
    clue,
    getCheckCorrection,
    getClueValue,
    players,
    boardControl,
    soloDispatch,
    type,
  } = useEngineContext();

  if (!activeClue || !clue) {
    throw new Error("No active clue");
  }

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const { armed: confirmingUndo, setArmed: setConfirmingUndo } =
    React.useContext(UndoArmingContext);

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

  const hasBoardControl = boardControl === userId;
  const isRevealingAnswer = type === GameState.ReadLongFormClue;
  const correction = getCheckCorrection(userId);

  // Submit the form by default after a few seconds. Pause the countdown
  // while the undo confirmation is armed so it can't be yanked away
  // mid-decision.
  useTimeout(
    () => {
      fetcher.submit(formRef.current);
    },
    hasBoardControl && !clue.longForm && !confirmingUndo
      ? DEFAULT_COUNTDOWN_MS
      : null,
  );

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {!isRevealingAnswer && (
        <PlayerScores
          answerers={answerers}
          boardControlName={boardControlName}
          wagerable={clue.wagerable ?? false}
          longForm={clue.longForm ?? false}
        />
      )}
      {correction && confirmingUndo ? (
        <UndoCheckConfirm
          roomId={roomId}
          userId={userId}
          prompt="Undo your check on this clue?"
          onCancel={() => setConfirmingUndo(false)}
        />
      ) : (
        <div className="flex gap-2">
          {correction ? (
            <UndoCheckButton onClick={() => setConfirmingUndo(true)} />
          ) : null}
          {hasBoardControl || clue.longForm ? (
            <fetcher.Form
              method="POST"
              action={`/room/${roomId}/next-clue`}
              ref={formRef}
            >
              <input type="hidden" value={userId} name="userId" />
              <input type="hidden" value={i} name="i" />
              <input type="hidden" value={j} name="j" />
              <Button
                variant="primary"
                type="submit"
                autoFocus
                loading={loading}
              >
                <div
                  className="absolute left-0 h-full rounded-md bg-blue-400"
                  style={{
                    animation:
                      clue.longForm || confirmingUndo
                        ? undefined
                        : `${
                            DEFAULT_COUNTDOWN_MS / 1000
                          }s linear 0s 1 growFromLeft forwards`,
                  }}
                />
                <span className="relative">
                  {isRevealingAnswer ? "Reveal answer" : "Back to board"}
                </span>
              </Button>
            </fetcher.Form>
          ) : null}
        </div>
      )}
    </div>
  );
}
