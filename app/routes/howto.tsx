import type { V2_MetaFunction } from "@remix-run/node";
import * as React from "react";

import Button from "~/components/button";
import { ErrorMessage, SuccessMessage } from "~/components/error";
import HowToPlay from "~/components/how-to-play";
import { Anchor } from "~/components/link";
import Main from "~/components/main";
import { Kbd } from "~/components/prompt/kbd";
import { Lockout } from "~/components/prompt/lockout";
import { ReadClueTimer } from "~/components/prompt/read-clue-timer";
import { CLUE_TIMEOUT_MS } from "~/engine";
import useKeyPress from "~/utils/use-key-press";
import useTimeout from "~/utils/use-timeout";

export const meta: V2_MetaFunction = () => [{ title: "How to Play" }];

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
  const animationRef = React.useRef(0);

  const buzzDurationMs =
    buzzedAt !== undefined && buzzerOpenAt !== undefined
      ? buzzedAt - buzzerOpenAt
      : null;

  // Open the buzzers after the clue is done being "read".
  useTimeout(
    () => setBuzzerOpenAt(Date.now()),
    buzzedAt === undefined ? CLUE_DURATION_MS : null,
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
      : null,
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

    return () => cancelAnimationFrame(animationRef.current);
  }, [buzzerOpenAt, buzzedAt]);

  return (
    <div className="max-w-full grow">
      <Main>
        <HowToPlay />
        <h1 className="mb-4 text-2xl font-semibold">No typing required</h1>
        <p className="mb-4">
          Jep! is a fast-paced, high-trust group party game.
        </p>
        <p className="mb-4">
          Join the same room or voice call while playing so you can speak the
          answers out loud to one another instead of typing. This keeps the game
          fast.
        </p>
        <p className="mb-4">
          We trust the guesser to honestly check their answers as right or
          wrong. All players in the room or voice call will hear the guess.
          Then, the guesser sees the correct answer and checks themselves.
        </p>
        <div className="p-2">
          <img src="/images/card.jpg" alt="Looking at cards privately" />
          <p className="text-center text-sm">
            Photo by{" "}
            <Anchor href="https://unsplash.com/fr/@samgoh_">Sam Goh</Anchor> on{" "}
            <Anchor href="https://unsplash.com/photos/Wfe_gWCpciU">
              Unsplash
            </Anchor>
          </p>
        </div>
        <p className="mb-4">
          If they say they were wrong, the buzzers re-open for other people to
          buzz in and guess. Don't spoil the correct answer by reading it out
          loud before other people have a chance to guess!
        </p>
        <p className="mb-4">
          If they say they were right, the answer is revealed to everyone. If
          they were lying about being right earlier, don't play with them again!
        </p>
        <p className="mb-4">
          If no one buzzes in, the answer is revealed to everyone.
        </p>

        <h1 className="mb-4 text-2xl font-semibold">Buzzer practice</h1>
        <button
          className="relative w-full bg-blue-1000 py-2"
          onClick={() => handleClick(Date.now())}
        >
          <ReadClueTimer
            clueDurationMs={CLUE_DURATION_MS}
            shouldAnimate={buzzedAt === undefined}
            wonBuzz={buzzedAt !== undefined && buzzedAt <= CLUE_TIMEOUT_MS}
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
              <ErrorMessage>
                You were locked out for {LOCKOUT_MS}ms for buzzing in before the
                clue was done being "read".
              </ErrorMessage>
            ) : null}
            {buzzDurationMs && buzzDurationMs > CLUE_TIMEOUT_MS ? (
              <ErrorMessage>
                You didn't buzz in within {CLUE_TIMEOUT_MS / 1000} seconds after
                the clue was done being "read".
              </ErrorMessage>
            ) : null}
            {buzzedAt !== undefined &&
            buzzDurationMs &&
            buzzDurationMs <= CLUE_TIMEOUT_MS ? (
              <SuccessMessage>
                You successfully buzzed in {buzzDurationMs}ms!
              </SuccessMessage>
            ) : null}
            <div className="flex">
              <Button onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </div>
      </Main>
    </div>
  );
}
