import * as React from "react";
import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import { Textfit } from "react-textfit";

import { useEngineContext } from "~/engine/use-engine-context";
import type { Player } from "~/engine/engine";
import { stringToHslColor } from "~/utils/utils";
import Button from "~/components/button";
import { CLUE_TIMEOUT_MS, GameState } from "~/engine/engine";
import useKeyPress from "~/utils/use-key-press";

import AnswerForm from "./answer-form";
import NextClueForm from "./next-clue-form";
import Fade from "./fade";
import Lockout from "./lockout";
import Countdown from "./countdown";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 50;

/** LOCKOUT_MS applies a 500ms lockout if a contestant buzzes before the clue is read. */
const LOCKOUT_MS = 500;

function Buzz({ player, durationMs }: { player?: Player; durationMs: number }) {
  const color = player ? stringToHslColor(player.userId) : "gray";
  const durationMsg = durationMs === -1 ? "cannot buzz" : durationMs + "ms";
  return (
    <div
      className="px-2 py-1 flex flex-col items-center justify-center text-white text-shadow"
      style={{ color }}
    >
      <div className="font-bold">{player?.name ?? "Unknown player"}</div>
      <div>{durationMsg}</div>
    </div>
  );
}

function BuzzerLight({ active }: { active: boolean }) {
  if (active) {
    /* Heroicon name: solid/check-circle */
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-20 h-20 mb-4 mr-4 text-green-600 rounded-full bg-green-200 shadow-glow-green-200"
        role="img"
        aria-labelledby="check-title"
      >
        <title id="check-title">OK to buzz!</title>
        <path
          fillRule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-20 h-20 mb-4 mr-4 text-red-600 rounded-full bg-red-200 shadow-glow-red-200"
      role="img"
      aria-labelledby="x-title"
    >
      <title id="x-title">Do not buzz yet</title>
      <path
        fillRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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
  console.log("showanswer is", showAnswer, type);

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
      console.log("changed show answer", type);
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
        return fetcher.submit(
          {
            i: i.toString(),
            j: j.toString(),
            userId,
            deltaMs: (CLUE_TIMEOUT_MS + 1).toString(),
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
      console.log("lockout >:(");
      return setLockout(true);
    }

    if (buzzerOpenAt === undefined || !clueIdx) {
      return;
    }

    console.log("submitting");
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
          <div className="p-4 text-white">
            <span className="font-bold">{category}</span> for{" "}
            <span className="font-bold">${clue?.value}</span>
          </div>
          <button
            type="button"
            disabled={
              lockout ||
              myBuzzDurationMs !== undefined ||
              type !== GameState.ReadClue
            }
            onClick={() => handleClick(Date.now())}
            onKeyDown={(e) => console.log("got keydown....", e)}
            className="p-4 flex flex-col justify-center flex-grow uppercase text-center text-shadow-md font-korinna"
            autoFocus={
              shouldShowPrompt &&
              !shouldShowAnswerToBuzzer &&
              !shouldShowAnswerToAll
            }
          >
            <Textfit className="text-white grow w-full" mode="multi">
              {clue?.clue}
              <br />
              <span
                className={classNames("text-cyan-300", {
                  "opacity-0": !showAnswer && !shouldShowAnswerToAll,
                })}
              >
                {clue?.answer}
              </span>
            </Textfit>
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
                      />
                    )
                  )
                : null}
            </div>
            <BuzzerLight active={buzzerOpenAt !== undefined} />
          </div>
          <Countdown startTime={myBuzzDurationMs ? buzzerOpenAt : undefined} />
          <div
            className={classNames("h-8 md:h-16 bg-white self-start", {
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
