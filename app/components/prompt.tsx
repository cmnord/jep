import * as React from "react";
import classNames from "classnames";

import { useGameContext } from "~/utils/use-game-context";
import { CLUE_TIMEOUT_MS, GameState } from "~/utils/use-game";
import type { Player } from "~/utils/use-game";
import type { FetcherWithComponents } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { stringToHslColor } from "~/utils/utils";
import Button from "./button";

/** MS_PER_CHARACTER is a heuristic value to scale the amount of time per clue by
 * its length.
 */
const MS_PER_CHARACTER = 50;

/** LOCKOUT_MS applies a 500ms lockout if a contestant buzzes before the clue is read. */
const LOCKOUT_MS = 500;

function Fade({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [shouldRender, setRender] = React.useState(show);

  React.useEffect(() => {
    if (show) setRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setRender(false);
  };

  return shouldRender ? (
    <div
      className={classNames("fixed left-0 top-0", {
        "animate-slideIn": show,
        "animate-slideOut": !show,
      })}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
}

/** Lockout is a visual indicator that a contestant buzzed too early. */
function Lockout({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="absolute left-0 top-0 w-full h-full bg-black bg-opacity-50">
      <div
        className={
          "flex flex-col items-center justify-start pt-10 w-full h-full text-white font-bold " +
          "text-6xl md:text-7xl lg:text-9xl"
        }
      >
        LOCKOUT
      </div>
    </div>
  );
}

function Buzz({ player, durationMs }: { player?: Player; durationMs: number }) {
  const color = player ? stringToHslColor(player.userId) : "gray";
  const durationMsg =
    durationMs > CLUE_TIMEOUT_MS ? "cannot buzz" : durationMs + "ms";
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
  roomName,
  userId,
  fetcher,
  clueIdx,
}: {
  roomName: string;
  userId: string;
  fetcher: FetcherWithComponents<any>;
  clueIdx: [number, number] | undefined;
}) {
  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  return (
    <fetcher.Form
      method="post"
      action={`/room/${roomName}/answer`}
      className="absolute top-2/3 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <p className="text-white font-bold">Was your answer correct?</p>
      <p className="text-gray-300 text-sm text-center">
        Only you can see the answer for now. After this, it will be revealed to
        all players.
      </p>
      <div className="flex gap-2">
        <Button htmlType="submit" name="result" value="incorrect">
          incorrect!
        </Button>
        <Button
          htmlType="submit"
          name="result"
          value="correct"
          type="primary"
          autoFocus
        >
          correct!
        </Button>
      </div>
    </fetcher.Form>
  );
}

function AdvanceClueButton({
  roomName,
  userId,
  fetcher,
  clueIdx,
}: {
  roomName: string;
  userId: string;
  fetcher: FetcherWithComponents<any>;
  clueIdx: [number, number] | undefined;
}) {
  const { players, boardControl, numAnswered, numCluesInBoard } =
    useGameContext();

  const [i, j] = clueIdx ? clueIdx : [-1, -1];
  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.userId === userId
      ? "You"
      : boardController.name
    : "Unknown player";

  const cluesLeftInRound = numCluesInBoard - numAnswered;

  return (
    <fetcher.Form
      method="post"
      action={`/room/${roomName}/next-clue`}
      className="absolute top-2/3 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      {/* TODO: show who won how much money */}
      {cluesLeftInRound ? (
        <p className="text-white font-bold text-center">
          {boardControlName} will choose the next clue.
        </p>
      ) : null}
      <p className="text-gray-300 text-sm text-center">
        Click "OK" to return to the board for all players.
      </p>
      <Button htmlType="submit" type="primary" autoFocus>
        OK
      </Button>
    </fetcher.Form>
  );
}

export default function Prompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { type, clue, activeClue, buzzes, players, winningBuzzer } =
    useGameContext();

  const shouldShowPrompt =
    type === GameState.ReadClue ||
    type === GameState.RevealAnswerToBuzzer ||
    type === GameState.RevealAnswerToAll;

  const shouldShowAnswerToBuzzer =
    type === GameState.RevealAnswerToBuzzer && winningBuzzer === userId;
  const shouldShowAnswerToAll = type === GameState.RevealAnswerToAll;

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

  const numCharactersInClue = clue?.clue.length ?? 0;
  const clueDurationMs = MS_PER_CHARACTER * numCharactersInClue;

  // Keep activeClue set to the last valid clue index.
  React.useEffect(() => {
    if (activeClue) {
      setClueShownAt(Date.now());
      setClueIdx(activeClue);
    } else {
      setClueShownAt(undefined);
    }
    setBuzzerOpenAt(myBuzzDurationMs);
  }, [activeClue, myBuzzDurationMs]);

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
    if (clueShownAt === undefined) {
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

  return (
    <Fade show={shouldShowPrompt}>
      <div className="relative">
        <button
          disabled={lockout || myBuzzDurationMs !== undefined}
          className={classNames(
            "h-screen w-screen bg-blue-1000 flex flex-col justify-center items-center"
          )}
          onClick={() => handleClick(Date.now())}
          autoFocus={
            shouldShowPrompt &&
            !shouldShowAnswerToBuzzer &&
            !shouldShowAnswerToAll
          }
        >
          <div className="p-4 flex flex-grow items-center">
            <div className="text-white uppercase text-center text-4xl md:text-5xl lg:text-7xl text-shadow-md font-korinna word-spacing-1">
              <div>
                <p className="mb-8 leading-normal">{clue?.clue}</p>
                <p
                  className={classNames("text-cyan-300", {
                    "opacity-0":
                      !shouldShowAnswerToBuzzer && !shouldShowAnswerToAll,
                  })}
                >
                  {clue?.answer}
                </p>
              </div>
            </div>
          </div>
          <Lockout active={lockout} />
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
          <div
            className={classNames("h-8 md:h-16 bg-white self-start", {
              "w-0": myBuzzDurationMs === undefined,
              "w-full": myBuzzDurationMs !== undefined,
            })}
            style={
              myBuzzDurationMs === undefined
                ? {
                    animation: `${
                      clueDurationMs / 1000
                    }s linear 0s 1 growFromLeft forwards`,
                  }
                : undefined
            }
          />
        </button>
        {shouldShowAnswerToBuzzer && (
          <AnswerEvaluator
            fetcher={fetcher}
            roomName={roomName}
            userId={userId}
            clueIdx={clueIdx}
          />
        )}
        {shouldShowAnswerToAll && (
          <AdvanceClueButton
            fetcher={fetcher}
            roomName={roomName}
            userId={userId}
            clueIdx={clueIdx}
          />
        )}
      </div>
    </Fade>
  );
}
