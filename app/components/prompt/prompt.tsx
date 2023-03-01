import * as React from "react";
import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import { useEngineContext } from "~/engine/use-engine-context";
import Button from "~/components/button";
import { CLUE_TIMEOUT_MS, GameState } from "~/engine/engine";
import useKeyPress from "~/utils/use-key-press";

import AnswerForm from "./answer-form";
import NextClueForm from "./next-clue-form";
import Fade from "./fade";
import Lockout from "./lockout";
import Countdown from "./countdown";
import Kbd from "./kbd";
import Buzz from "./buzz";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 50;

/** LOCKOUT_MS applies a 500ms lockout if a contestant buzzes before the clue is read. */
const LOCKOUT_MS = 500;

function AnswerEvaluator({
  isOpen,
  roomName,
  userId,
  clueIdx,
  showAnswer,
  onClickShowAnswer,
  loading,
}: {
  isOpen: boolean;
  roomName: string;
  userId: string;
  clueIdx: [number, number] | undefined;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
  loading: boolean;
}) {
  const { type } = useEngineContext();

  if (!showAnswer) {
    return (
      <div
        className={classNames("p-2 flex flex-col items-center gap-2", {
          "opacity-0": !isOpen,
        })}
      >
        <p className="text-gray-300 text-sm">
          State your answer in the form of a question, then
        </p>
        <Button
          type="primary"
          htmlType="button"
          disabled={!isOpen}
          autoFocus={!isOpen}
          onClick={onClickShowAnswer}
          loading={loading}
        >
          Reveal answer
        </Button>
      </div>
    );
  }

  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  if (type === GameState.RevealAnswerToAll) {
    return <NextClueForm roomName={roomName} userId={userId} i={i} j={j} />;
  }

  return <AnswerForm roomName={roomName} userId={userId} i={i} j={j} />;
}

export default function Prompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { type, clue, category, activeClue, buzzes, players, winningBuzzer } =
    useEngineContext();

  const shouldShowPrompt =
    type === GameState.ReadClue ||
    type === GameState.RevealAnswerToBuzzer ||
    type === GameState.RevealAnswerToAll;

  const shouldShowAnswerToBuzzer =
    type === GameState.RevealAnswerToBuzzer && winningBuzzer === userId;
  const shouldShowAnswerToAll = type === GameState.RevealAnswerToAll;

  // Only show the answer to the buzzer once they click "reveal".
  const [showAnswer, setShowAnswer] = React.useState(shouldShowAnswerToAll);

  const [optimisticBuzzes, setOptimisticBuzzes] = React.useState(buzzes);
  const myBuzzDurationMs = optimisticBuzzes?.get(userId);

  const [clueShownAt, setClueShownAt] = React.useState<number | undefined>(
    myBuzzDurationMs
  );
  const [clueIdx, setClueIdx] = React.useState(activeClue);

  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>(
    myBuzzDurationMs
  );
  const [lockout, setLockout] = React.useState(false);

  const fetcher = useFetcher();
  const loading = fetcher.state === "loading";

  const numCharactersInClue = clue?.clue.length ?? 0;
  const clueDurationMs = MS_PER_CHARACTER * numCharactersInClue;

  // Keep activeClue set to the last valid clue index.
  React.useEffect(() => {
    if (activeClue) {
      setClueShownAt(Date.now());
      setClueIdx(activeClue);
      setShowAnswer(type === GameState.RevealAnswerToAll);
    } else {
      setClueShownAt(undefined);
    }
    setBuzzerOpenAt(myBuzzDurationMs);
  }, [activeClue, myBuzzDurationMs, type]);

  // Update optimisticBuzzes once buzzes come in from the server.
  React.useEffect(() => {
    setOptimisticBuzzes(buzzes);
  }, [buzzes]);

  // Open the buzzer after the clue is done being "read".
  React.useEffect(() => {
    if (myBuzzDurationMs === undefined) {
      const clueReadTimer = setTimeout(() => {
        setBuzzerOpenAt(Date.now());
      }, clueDurationMs);
      return () => clearTimeout(clueReadTimer);
    }
  }, [clueDurationMs, myBuzzDurationMs]);

  // Remove the lockout after 500ms.
  React.useEffect(() => {
    if (lockout) {
      const lockoutTimer = setTimeout(() => {
        setLockout(false);
      }, LOCKOUT_MS);
      return () => clearTimeout(lockoutTimer);
    }
  }, [lockout]);

  // If the contestant doesn't buzz for 5 seconds, close the buzzer and send a
  // 5-second "non-buzz" buzz to the server.
  React.useEffect(() => {
    if (type === GameState.ReadClue && buzzerOpenAt !== undefined && clueIdx) {
      const [i, j] = clueIdx;
      const buzzLimitTimer = setTimeout(() => {
        const deltaMs = CLUE_TIMEOUT_MS + 1;
        setOptimisticBuzzes((old) => {
          if (!old) {
            return new Map([[userId, deltaMs]]);
          }
          if (old.has(userId)) {
            return old;
          }
          return new Map([...old, [userId, deltaMs]]);
        });
        return fetcher.submit(
          {
            i: i.toString(),
            j: j.toString(),
            userId,
            deltaMs: deltaMs.toString(),
          },
          { method: "post", action: `/room/${roomName}/buzz` }
        );
      }, CLUE_TIMEOUT_MS);
      return () => clearTimeout(buzzLimitTimer);
    }
  }, [buzzerOpenAt, clueIdx, fetcher, roomName, userId, type]);

  const handleClick = (clickedAtMs: number) => {
    if (
      clueShownAt === undefined ||
      lockout ||
      myBuzzDurationMs !== undefined
    ) {
      return;
    }

    const lockoutDeltaMs = clickedAtMs - clueShownAt;
    if (lockoutDeltaMs < clueDurationMs) {
      return setLockout(true);
    }

    if (buzzerOpenAt === undefined || !clueIdx) {
      return;
    }

    // Contestant buzzed, so submit their buzz time
    const [i, j] = clueIdx;
    const clueDeltaMs = clickedAtMs - buzzerOpenAt;

    setOptimisticBuzzes((old) =>
      old ? old.set(userId, clueDeltaMs) : new Map([[userId, clueDeltaMs]])
    );

    return fetcher.submit(
      {
        i: i.toString(),
        j: j.toString(),
        userId,
        deltaMs: clueDeltaMs.toString(),
      },
      { method: "post", action: `/room/${roomName}/buzz` }
    );
  };

  useKeyPress("Enter", () => handleClick(Date.now()));

  return (
    <Fade show={shouldShowPrompt}>
      <div className="relative">
        <div
          className={classNames(
            "h-screen w-screen bg-blue-1000 flex flex-col justify-center"
          )}
        >
          <div className="flex justify-between p-4">
            <div className="text-white">
              <span className="font-bold">{category}</span> for{" "}
              <span className="font-bold">${clue?.value}</span>
            </div>
            <span className="text-sm text-gray-300">
              Click or press <Kbd>Enter</Kbd> to buzz in
            </span>
          </div>
          <button
            type="button"
            disabled={
              lockout ||
              myBuzzDurationMs !== undefined ||
              type !== GameState.ReadClue
            }
            onClick={() => handleClick(Date.now())}
            className="p-4 flex flex-col justify-center flex-grow uppercase text-center text-shadow-md font-korinna"
            autoFocus={
              shouldShowPrompt &&
              !shouldShowAnswerToBuzzer &&
              !shouldShowAnswerToAll
            }
          >
            <p className="text-white grow w-full block word-spacing-1 text-4xl leading-relaxed md:text-5xl md:leading-normal">
              {clue?.clue}
              <br />
              <span
                className={classNames("text-cyan-300", {
                  "opacity-0": !showAnswer && !shouldShowAnswerToAll,
                })}
              >
                {clue?.answer}
              </span>
            </p>
          </button>
          <Lockout active={lockout} />
          <AnswerEvaluator
            isOpen={shouldShowAnswerToBuzzer || showAnswer}
            roomName={roomName}
            userId={userId}
            clueIdx={clueIdx}
            showAnswer={showAnswer}
            onClickShowAnswer={() => {
              setShowAnswer(true);
            }}
            loading={loading}
          />
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-4 ml-4">
              {optimisticBuzzes
                ? // TODO: sort buzzes?
                  Array.from(optimisticBuzzes.entries()).map(
                    ([userId, durationMs], i) => (
                      <Buzz
                        key={i}
                        player={players.get(userId)}
                        durationMs={durationMs}
                        won={
                          winningBuzzer === userId &&
                          type === GameState.RevealAnswerToAll
                        }
                        clueValue={clue?.value}
                      />
                    )
                  )
                : null}
            </div>
          </div>
          <Countdown
            startTime={type === GameState.ReadClue ? buzzerOpenAt : undefined}
          />
          <div
            className={classNames("h-8 bg-white self-start", {
              "w-0": myBuzzDurationMs === undefined,
              "w-full":
                myBuzzDurationMs !== undefined || type !== GameState.ReadClue,
            })}
            style={{
              animation:
                type !== GameState.ReadClue
                  ? "none"
                  : `${
                      clueDurationMs / 1000
                    }s linear 0s 1 growFromLeft forwards`,
            }}
          />
        </div>
      </div>
    </Fade>
  );
}
