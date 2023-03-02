import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";

import type { Action } from "~/engine";
import { CLUE_TIMEOUT_MS, GameState, useEngineContext } from "~/engine";
import type { Clue } from "~/models/convert.server";
import useKeyPress from "~/utils/use-key-press";
import { useSoloAction } from "~/utils/use-solo-action";
import { useTimeout } from "~/utils/use-timeout";

import { ConnectedAnswerForm as AnswerForm } from "./answer-evaluator";
import { Buzzes } from "./buzz";
import { Countdown } from "./countdown";
import { Fade } from "./fade";
import { Kbd } from "./kbd";
import { Lockout } from "./lockout";
import { NextClueForm } from "./next-clue-form";
import { ReadClueTimer } from "./read-clue-timer";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 50;

/** LOCKOUT_MS applies a 500ms lockout if a contestant buzzes before the clue is read. */
const LOCKOUT_MS = 500;

function Prompt({
  isOpen,
  category,
  clue,
  canBuzz,
  onBuzz,
  focusOnBuzz,
  showAnswer,
  children,
}: {
  isOpen: boolean;
  category?: string;
  clue?: Clue;
  canBuzz: boolean;
  onBuzz: (buzzedAt: number) => void;
  focusOnBuzz: boolean;
  showAnswer: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Fade show={isOpen}>
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
            disabled={!canBuzz}
            onClick={() => onBuzz(Date.now())}
            className="p-4 flex flex-col justify-center flex-grow uppercase text-center text-shadow-md font-korinna"
            autoFocus={focusOnBuzz}
          >
            <p className="text-white grow w-full block word-spacing-1 text-4xl leading-relaxed md:text-5xl md:leading-normal">
              {clue?.clue}
              <br />
              <span
                className={classNames("text-cyan-300", {
                  "opacity-0": !showAnswer,
                })}
              >
                {clue?.answer}
              </span>
            </p>
          </button>
          {children}
        </div>
      </div>
    </Fade>
  );
}

export function ConnectedPrompt({
  roomName,
  userId,
  setFocusedClue,
}: {
  roomName: string;
  userId: string;
  setFocusedClue: (i: number, j: number) => void;
}) {
  const {
    type,
    clue,
    category,
    activeClue,
    buzzes,
    players,
    winningBuzzer,
    soloDispatch,
    answeredBy,
  } = useEngineContext();

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

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
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
  const delayMs = myBuzzDurationMs === undefined ? clueDurationMs : null;
  useTimeout(() => setBuzzerOpenAt(Date.now()), delayMs);

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
    <Prompt
      isOpen={shouldShowPrompt}
      category={category}
      clue={clue}
      canBuzz={
        !lockout &&
        myBuzzDurationMs === undefined &&
        type === GameState.ReadClue
      }
      onBuzz={() => handleClick(Date.now())}
      focusOnBuzz={
        shouldShowPrompt && !shouldShowAnswerToBuzzer && !shouldShowAnswerToAll
      }
      showAnswer={showAnswer || shouldShowAnswerToAll}
    >
      <Lockout active={lockout} />
      {type === GameState.RevealAnswerToAll ? (
        <NextClueForm
          roomName={roomName}
          userId={userId}
          clueIdx={clueIdx}
          setFocusedClue={setFocusedClue}
        />
      ) : (
        <AnswerForm
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
      )}
      <Buzzes
        buzzes={optimisticBuzzes}
        players={players}
        winningBuzzer={clueIdx ? answeredBy(clueIdx[0], clueIdx[1]) : undefined}
        showWinner={type === GameState.RevealAnswerToAll}
        clueValue={clue?.value}
      />
      <Countdown
        startTime={type === GameState.ReadClue ? buzzerOpenAt : undefined}
      />
      <ReadClueTimer
        clueDurationMs={clueDurationMs}
        shouldAnimate={
          myBuzzDurationMs === undefined && type === GameState.ReadClue
        }
      />
    </Prompt>
  );
}
