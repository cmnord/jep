import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { ActionType, GameState, useEngineContext } from "~/engine";
import { formatDollars, formatDollarsWithSign } from "~/utils";
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
        const clueValueStr = formatDollarsWithSign(
          correct ? value : -1 * value,
        );
        return (
          <div className="relative" key={i}>
            <div className="flex flex-col items-center text-shadow" key={i}>
              <span className="font-handwriting text-xl font-bold text-slate-300">
                {name}
              </span>
              <span
                className={clsx("font-inter text-xl font-bold", {
                  "text-white": score >= 0,
                  "text-red-400": score < 0,
                })}
              >
                {formatDollars(score)}
              </span>
            </div>
            <span
              className={clsx(
                "absolute -top-1/4 -right-1/2 animate-bounce font-inter font-bold whitespace-nowrap text-shadow",
                {
                  "text-green-300": correct,
                  "text-red-300": !correct,
                },
              )}
            >
              {clueValueStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NextClueForm({
  hasBoardControl,
  boardControlName,
  loading,
  answerers,
  wagerable,
  longForm,
  buttonText,
  hidePlayerScores,
}: {
  hasBoardControl: boolean;
  boardControlName: string;
  loading: boolean;
  answerers: PlayerScore[];
  wagerable: boolean;
  longForm: boolean;
  buttonText?: string;
  hidePlayerScores?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {!hidePlayerScores && (
        <PlayerScores
          answerers={answerers}
          boardControlName={boardControlName}
          wagerable={wagerable}
          longForm={longForm}
        />
      )}
      {hasBoardControl || longForm ? (
        <Button
          type="primary"
          htmlType="submit"
          autoFocus
          loading={loading}
          className="relative"
        >
          <div
            className="absolute left-0 h-full rounded-md bg-blue-400"
            style={{
              animation: longForm
                ? undefined
                : `${
                    DEFAULT_COUNTDOWN_MS / 1000
                  }s linear 0s 1 growFromLeft forwards`,
            }}
          />
          <span className="relative">{buttonText ?? "Back to board"}</span>
        </Button>
      ) : null}
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
    optimisticDispatch,
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

  function submitWithOptimistic(form: HTMLFormElement | null) {
    if (!form) {
      return;
    }
    const formData = new FormData(form);
    const clientMutationId = optimisticDispatch({
      type: ActionType.NextClue,
      payload: { userId, i, j },
    });
    if (clientMutationId) {
      formData.set("clientMutationId", clientMutationId);
    }
    fetcher.submit(formData, {
      method: "post",
      action: `/room/${roomId}/next-clue`,
    });
  }

  // Submit the form by default after a few seconds.
  useTimeout(
    () => {
      submitWithOptimistic(formRef.current);
    },
    hasBoardControl && !clue.longForm ? DEFAULT_COUNTDOWN_MS : null,
  );

  return (
    <fetcher.Form
      method="POST"
      action={`/room/${roomId}/next-clue`}
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        submitWithOptimistic(event.currentTarget);
      }}
    >
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <NextClueForm
        hasBoardControl={hasBoardControl}
        boardControlName={boardControlName}
        loading={loading}
        answerers={answerers}
        wagerable={clue.wagerable ?? false}
        longForm={clue.longForm ?? false}
        buttonText={isRevealingAnswer ? "Reveal answer" : undefined}
        hidePlayerScores={isRevealingAnswer}
      />
    </fetcher.Form>
  );
}
