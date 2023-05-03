import type { V2_MetaFunction } from "@remix-run/node";
import * as React from "react";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import HowToPlay from "~/components/how-to-play";
import { Kbd } from "~/components/prompt/kbd";
import { Lockout } from "~/components/prompt/lockout";
import { ReadClueTimer } from "~/components/prompt/read-clue-timer";
import { CLUE_TIMEOUT_MS } from "~/engine";
import useKeyPress from "~/utils/use-key-press";
import { useTimeout } from "~/utils/use-timeout";

export const meta: V2_MetaFunction = () => [{ title: "Jep! - How to Play" }];

const CLUE_DURATION_MS = 5000;
const LOCKOUT_MS = 250;

const formatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  fractionalSecondDigits: 3,
});

export default function HowTo() {
  const [clueShownAt, setClueShownAt] = React.useState(Date.now());
  const [buzzedAt, setBuzzedAt] = React.useState<number | undefined>();
  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>();
  const [lockout, setLockout] = React.useState(false);
  const [hadLockout, setHadLockout] = React.useState(false);
  const [msLeft, setMsLeft] = React.useState<number | undefined>();
  const animationRef = React.useRef<number>();

  const buzzDurationMs =
    buzzedAt !== undefined && buzzerOpenAt !== undefined
      ? buzzedAt - buzzerOpenAt
      : null;

  // Open the buzzers after the clue is done being "read".
  useTimeout(
    () => setBuzzerOpenAt(Date.now()),
    buzzedAt === undefined ? CLUE_DURATION_MS : null
  );

  // Remove the lockout after 500ms.
  useTimeout(() => setLockout(false), lockout ? LOCKOUT_MS : null);

  // If the contestant doesn't buzz for 5 seconds, close the buzzer and send a
  // 5-second "non-buzz" buzz to the server.
  useTimeout(
    () => {
      setBuzzedAt(Date.now());
    },
    buzzerOpenAt !== undefined && buzzedAt === undefined
      ? CLUE_TIMEOUT_MS
      : null
  );

  function handleClick(clickedAtMs: number) {
    if (lockout || buzzedAt !== undefined) {
      return;
    }

    const lockoutDeltaMs = clickedAtMs - clueShownAt;
    if (lockoutDeltaMs < CLUE_DURATION_MS) {
      setHadLockout(true);
      return setLockout(true);
    }

    setBuzzedAt(clickedAtMs);
  }

  useKeyPress("Enter", () => handleClick(Date.now()));

  function handleReset() {
    setClueShownAt(Date.now());
    setBuzzedAt(undefined);
    setBuzzerOpenAt(undefined);
    setLockout(false);
    setHadLockout(false);
    setMsLeft(undefined);
  }

  React.useEffect(() => {
    const animate = (timeMs: number) => {
      const elapsedMs = Date.now() - timeMs;
      const newMsLeft = Math.max(CLUE_DURATION_MS - elapsedMs, 0);
      setMsLeft(newMsLeft);

      if (newMsLeft > 0) {
        animationRef.current = requestAnimationFrame(() => animate(timeMs));
      }
    };

    if (buzzerOpenAt !== undefined && buzzedAt === undefined) {
      animationRef.current = requestAnimationFrame(() => animate(buzzerOpenAt));
    }

    return () => cancelAnimationFrame(animationRef.current!);
  }, [buzzerOpenAt, buzzedAt]);

  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md">
        <div className="px-4 pt-8 md:pt-16">
          <HowToPlay />
          <h2 className="mb-4 text-2xl font-semibold">Buzzer practice</h2>
        </div>
        <button
          className="relative w-full bg-blue-1000 py-2"
          onClick={() => handleClick(Date.now())}
        >
          <ReadClueTimer
            clueDurationMs={CLUE_DURATION_MS}
            shouldAnimate={buzzedAt === undefined}
            wonBuzz={buzzedAt !== undefined && buzzedAt < CLUE_TIMEOUT_MS}
          />
          <div className="flex flex-col p-2">
            <div className="flex justify-between p-4">
              <div className="text-white">
                <span className="font-bold">Apples</span> for{" "}
                <span className="font-bold">$200</span>
              </div>
              <span className="text-sm text-slate-300">
                Click or press <Kbd>Enter</Kbd> to buzz in
              </span>
            </div>
            <p className="text-shadow-md font-korinna text-xl font-bold uppercase text-white">
              This apple variety is named after a city in New York State
            </p>
            <Lockout active={lockout} />
          </div>
        </button>
        <div className="bg-slate-200 p-2">
          <table className="w-full table-fixed font-mono">
            <tbody>
              <tr>
                <td>Clue shown at:</td>
                <td className="text-right">
                  {clueShownAt ? formatter.format(clueShownAt) : "null"}
                </td>
              </tr>
              <tr>
                <td>Buzzer open at:</td>
                <td className="text-right">
                  {buzzerOpenAt ? formatter.format(buzzerOpenAt) : "null"}
                </td>
              </tr>
              <tr>
                <td>Time remaining:</td>
                <td className="text-right">
                  {msLeft !== undefined ? `${msLeft}ms` : "null"}
                </td>
              </tr>
              <tr>
                <td>Buzzed at:</td>
                <td className="text-right">
                  {buzzedAt ? formatter.format(buzzedAt) : "null"}
                </td>
              </tr>
              <tr>
                <td>Buzz duration:</td>
                <td className="text-right">
                  {buzzDurationMs !== null && buzzDurationMs <= CLUE_TIMEOUT_MS
                    ? `${buzzDurationMs}ms`
                    : "null"}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="my-4 w-full border-b border-b-slate-400" />
          <div className="flex flex-col gap-2">
            {hadLockout ? (
              <ErrorMessage
                message={`You were locked out for ${LOCKOUT_MS}ms for buzzing in
                before the clue was done being "read".`}
              />
            ) : null}
            {buzzDurationMs && buzzDurationMs > CLUE_TIMEOUT_MS ? (
              <ErrorMessage
                message={`You didn't buzz in within ${CLUE_TIMEOUT_MS / 1000}
                seconds after the clue was done being "read".`}
              />
            ) : null}
            {buzzedAt !== undefined &&
            buzzDurationMs &&
            buzzDurationMs < CLUE_TIMEOUT_MS ? (
              <SuccessMessage
                message={`You successfully buzzed in ${buzzDurationMs}ms!`}
              />
            ) : null}
            <div className="flex">
              <Button onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}