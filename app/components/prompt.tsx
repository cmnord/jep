import * as React from "react";
import classNames from "classnames";

import { useGameContext } from "~/utils/use-game-context";
import { GameState } from "~/utils/use-game";
import { useFetcher } from "@remix-run/react";

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

function BuzzerLight({ active }: { active: boolean }) {
  if (active) {
    /* Heroicon name: solid/check-circle */
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-20 h-20 mb-4 text-green-600 rounded-full bg-green-200 shadow-glow-green-200"
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
      className="w-20 h-20 mb-4 text-red-600 rounded-full bg-red-200 shadow-glow-red-200"
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

export default function Prompt({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { type, clue, activeClue } = useGameContext();

  const [clueShownAt, setClueShownAt] = React.useState<number | undefined>();
  const [clueIdx, setClueIdx] = React.useState(activeClue);

  const [buzzable, setBuzzable] = React.useState(false);
  const [lockout, setLockout] = React.useState(false);

  const fetcher = useFetcher();

  const numCharactersInClue = clue?.clue.length ?? 0;
  const clueDurationMs = MS_PER_CHARACTER * numCharactersInClue;

  React.useEffect(() => {
    if (clue && activeClue) {
      setClueShownAt(Date.now());
      setClueIdx(activeClue);
    } else {
      setClueShownAt(undefined);
      setClueIdx(undefined);
    }
    setBuzzable(false);
  }, [clue, activeClue]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBuzzable(true);
    }, clueDurationMs);
    return () => clearTimeout(timer);
  }, [clueDurationMs]);

  React.useEffect(() => {
    if (lockout) {
      const lockoutTimer = setTimeout(() => {
        setLockout(false);
      }, LOCKOUT_MS);
      return () => clearTimeout(lockoutTimer);
    }
  }, [lockout]);

  const handleClick = (clickedAtMs: number) => {
    if (clueShownAt === undefined || !clueIdx) {
      return;
    }

    const delta = clickedAtMs - clueShownAt;
    if (delta < clueDurationMs) {
      setLockout(true);
      return;
    }

    // Contestant buzzed, so submit their buzz time
    const [i, j] = clueIdx;

    return fetcher.submit(
      { i: i.toString(), j: j.toString(), userId, delta: delta.toString() },
      { method: "post", action: `/room/${roomName}/buzz` }
    );
  };

  return (
    <Fade show={type === GameState.ReadClue}>
      <button
        disabled={lockout}
        className={classNames(
          "h-screen w-screen bg-blue-1000 flex flex-col justify-center items-center"
        )}
        onClick={() => handleClick(Date.now())}
        autoFocus
      >
        <div className="p-4 flex flex-grow items-center">
          <div className="text-white uppercase text-center text-4xl md:text-5xl lg:text-7xl text-shadow-md font-korinna word-spacing-1">
            <div>
              <p className="mb-8 leading-normal">{clue?.clue}</p>
              <p
                className={classNames("text-cyan-300", {
                  // TODO: show clue after buzz & evaluate
                  /*"opacity-0": state === State.ShowClue,*/
                })}
              >
                {clue?.answer}
              </p>
            </div>
          </div>
        </div>
        <Lockout active={lockout} />
        <BuzzerLight active={buzzable} />
        <div
          className="h-8 md:h-16 w-0 bg-white self-start"
          style={{
            animation: `${
              clueDurationMs / 1000
            }s linear 0s 1 growFromLeft forwards`,
          }}
        />
      </button>
    </Fade>
  );
}
