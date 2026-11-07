import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import {
  type AnswerTimerStatus,
  getAnswerTimerStatus,
} from "~/engine/answer-timer";
import { useTranslation } from "~/i18n";
import { serverNow } from "~/utils/server-clock";
import useSoloAction from "~/utils/use-solo-action";
import useGameSound from "~/utils/use-sound";

const TIMES_UP_SFX = "/sounds/times-up.mp3";
const TICK_MS = 250;
/** The bar turns red and pulses in the last seconds. */
const HURRY_SEC = 3;
/** A page that only learns about a timeout this long after it happened
 * (e.g. a reload) shows it without the sound. */
const TIMES_UP_SFX_WINDOW_MS = 5_000;

/** Answer turns (by start time) this page played the "time's up" sound for,
 * so it plays once per turn even if both the countdown and the notice after
 * it see the time run out. */
const timesUpPlayedFor = new Set<number>();

/** useTimesUpSound returns a function playing the "time's up" sound once per
 * answer turn. */
function useTimesUpSound() {
  const [play] = useGameSound(TIMES_UP_SFX);
  return React.useCallback(
    (turnStartedAt: number) => {
      if (timesUpPlayedFor.has(turnStartedAt)) return;
      timesUpPlayedFor.add(turnStartedAt);
      play();
    },
    [play],
  );
}

export interface AnswerTimer {
  /** A timed answer turn is going on. */
  timed: boolean;
  /** The player whose turn it is. */
  answererId?: string;
  durationSec: number;
  /** null until the page is hydrated (the time left depends on the
   * device's clock, so it is never rendered on the server). */
  status: AnswerTimerStatus | null;
}

/** useCountdownStatus is a countdown of `durationSec` from `startedAt` (a
 * room event timestamp, server clock, see utils/server-clock.ts), the same on
 * every device. It keeps ticking while the tab is in the background (as fast
 * as the browser lets it) and catches up as soon as the tab is visible
 * again. null when there is no countdown (`startedAt` null or no duration)
 * and until the page is hydrated. */
export function useCountdownStatus(
  startedAt: number | null,
  durationSec: number,
): AnswerTimerStatus | null {
  const running = startedAt !== null && durationSec > 0;
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!running || startedAt === null) {
      setNow(null);
      return;
    }
    const deadline = startedAt + durationSec * 1000;
    const tick = () => {
      const t = serverNow();
      setNow(t);
      if (t >= deadline) clearInterval(interval);
    };
    const interval = setInterval(tick, TICK_MS);
    tick();
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [running, startedAt, durationSec]);

  return running && startedAt !== null && now !== null
    ? getAnswerTimerStatus({ startedAt, durationSec, now })
    : null;
}

/** useAnswerTimer is the countdown of the current answer turn, the same on
 * every device: it runs from the timestamp of the room event that gave the
 * player their turn. */
export function useAnswerTimer(): AnswerTimer {
  const { type, answerTimeSec, answerStartedAt, winningBuzzer } =
    useEngineContext();
  const timed =
    type === GameState.RevealAnswerToBuzzer &&
    answerTimeSec > 0 &&
    answerStartedAt !== null &&
    winningBuzzer !== undefined;

  const status = useCountdownStatus(
    timed ? answerStartedAt : null,
    answerTimeSec,
  );

  return {
    timed,
    answererId: timed ? winningBuzzer : undefined,
    durationSec: answerTimeSec,
    status,
  };
}

/** AnswerTimerBar shows the time left as a shrinking bar and a sentence, or
 * "Time's up!". `status` null shows a full bar without text (before
 * hydration). */
export function AnswerTimerBar({
  status,
  variant = "screen",
  testId = "answer-timer",
  label,
  children,
}: {
  status: Pick<
    AnswerTimerStatus,
    "secondsLeft" | "fraction" | "expired"
  > | null;
  variant?: "screen" | "tv";
  /** Test id and accessible name (the answer timer's by default). */
  testId?: string;
  label?: string;
  /** Extra line under the timer (e.g. a hint for the answering player). */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const expired = status?.expired ?? false;
  const hurry = status !== null && !expired && status.secondsLeft <= HURRY_SEC;
  const tv = variant === "tv";
  return (
    <div
      className="flex w-full flex-col items-center gap-1 px-4 pb-2"
      data-testid={testId}
      data-state={status === null ? "pending" : expired ? "expired" : "running"}
      role="timer"
      aria-label={label ?? t("play.answerTimer.label")}
    >
      <div
        className={clsx(
          "w-full max-w-screen-sm overflow-hidden rounded-full bg-slate-500/60",
          tv ? "h-5" : "h-3",
        )}
      >
        <div
          className={clsx(
            "h-full rounded-full transition-[width] duration-200 ease-linear",
            hurry ? "animate-pulse bg-red-500" : "bg-yellow-300",
          )}
          style={{ width: `${(status?.fraction ?? 1) * 100}%` }}
        />
      </div>
      <p
        className={clsx(
          "text-center font-bold",
          expired ? "text-red-300 uppercase" : "text-white",
          tv ? "text-3xl lg:text-5xl" : expired ? "text-2xl" : "text-base",
        )}
        aria-live={expired ? "assertive" : "off"}
      >
        {status === null ? (
          // Keeps the height until the time left is known.
          <span className="invisible">0</span>
        ) : expired ? (
          t("play.answerTimer.timesUp")
        ) : (
          t("play.answerTimer.secondsLeft", { count: status.secondsLeft })
        )}
      </p>
      {children}
    </div>
  );
}

/** ConnectedAnswerTimer shows the current answer turn's countdown (nothing
 * when no timed turn is going on) and plays the "time's up" sound when it
 * runs out while this page watches it. */
export function ConnectedAnswerTimer({
  timer,
  variant = "screen",
  children,
}: {
  timer: AnswerTimer;
  variant?: "screen" | "tv";
  children?: React.ReactNode;
}) {
  const { status } = timer;
  const { answerStartedAt } = useEngineContext();
  useTimesUpWhenSeen(status?.expired, answerStartedAt);

  if (!timer.timed) return null;
  return (
    <AnswerTimerBar status={status} variant={variant}>
      {children}
    </AnswerTimerBar>
  );
}

/** useTimesUpWhenSeen plays the "time's up" sound when a countdown that
 * started at `startedAt` runs out while this page watches it (not when it
 * loads a step whose time is already over). */
function useTimesUpWhenSeen(
  expired: boolean | undefined,
  startedAt: number | null,
) {
  const playTimesUp = useTimesUpSound();
  const sawRunning = React.useRef(false);
  React.useEffect(() => {
    if (expired === false) {
      sawRunning.current = true;
    } else if (expired === true && sawRunning.current) {
      sawRunning.current = false;
      if (startedAt !== null) playTimesUp(startedAt);
    }
  }, [expired, startedAt, playTimesUp]);
}

/** StepTimer shows the countdown of a timed step other than an answer turn
 * (a wager, the Final answers), started at `startedAt` (server clock), with
 * the "time's up" sound. Renders nothing without a countdown. */
export function StepTimer({
  startedAt,
  durationSec,
  status,
  testId,
  label,
  variant = "screen",
  children,
}: {
  startedAt: number | null;
  durationSec: number;
  /** From useCountdownStatus(startedAt, durationSec). */
  status: AnswerTimerStatus | null;
  testId: string;
  label: string;
  variant?: "screen" | "tv";
  children?: React.ReactNode;
}) {
  useTimesUpWhenSeen(status?.expired, startedAt);
  if (startedAt === null || durationSec <= 0) return null;
  return (
    <AnswerTimerBar
      status={status}
      variant={variant}
      testId={testId}
      label={label}
    >
      {children}
    </AnswerTimerBar>
  );
}

/** useAutoWrongOnTimeout runs on the answering player's own device: when
 * their time runs out (and the room marks timeouts wrong), it sends the
 * normal "incorrect" check for them — once per turn, and not if they already
 * marked (or picked) themselves (`marked`). On a multiple choice question
 * it is a wrong answer without a pick. A tab in the background sends it as
 * soon as the browser runs its timers again (at the latest when the tab is
 * visible). If the player's device is offline, nothing is sent and the game
 * waits, like it does without a timer.
 *
 * Returns true once the time is up and the answer is (being) marked wrong,
 * so the prompt can hide the answer buttons. */
export function useAutoWrongOnTimeout({
  roomId,
  userId,
  timer,
  marked,
  asHost = false,
  enabled = true,
}: {
  roomId: number;
  userId: string;
  timer: AnswerTimer;
  /** The player already marked (or picked) themselves. */
  marked: boolean;
  /** Host mode (feature 22): this device is the host's and sends the
   * timeout for whoever is answering (the players' devices don't). */
  asHost?: boolean;
  /** false: never send (a player's device in host mode). */
  enabled?: boolean;
}) {
  const { activeClue, answerStartedAt, autoWrongOnTimeout, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const submit = fetcher.submit;

  const answererId = timer.answererId;
  const timeUp =
    enabled &&
    timer.timed &&
    answererId !== undefined &&
    (asHost || answererId === userId) &&
    autoWrongOnTimeout &&
    timer.status?.expired === true;

  // The turn (by its start time) the timeout was sent for.
  const sentFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (
      !timeUp ||
      !activeClue ||
      answerStartedAt === null ||
      sentFor.current === answerStartedAt ||
      marked
    ) {
      return;
    }
    sentFor.current = answerStartedAt;
    const [i, j] = activeClue;
    submit(
      {
        i: i.toString(),
        j: j.toString(),
        userId: answererId ?? userId,
        result: "incorrect",
        timedOut: "true",
        ...(asHost ? { host: "true" } : {}),
      },
      { method: "post", action: `/room/${roomId}/check` },
    );
  }, [
    timeUp,
    activeClue,
    answerStartedAt,
    marked,
    submit,
    userId,
    answererId,
    asHost,
    roomId,
  ]);

  return timeUp && !marked;
}

/** TimesUpNotice tells everyone that the last answer turn ran out of time
 * (and was marked wrong), after the question moved on: other players can
 * buzz, or the answer is shown. */
export function TimesUpNotice({
  variant = "screen",
}: {
  variant?: "screen" | "tv";
}) {
  const { answerTimedOut, answerTimeSec, players } = useEngineContext();
  const { t } = useTranslation();
  const playTimesUp = useTimesUpSound();

  React.useEffect(() => {
    if (!answerTimedOut) return;
    const deadline = answerTimedOut.startedAt + answerTimeSec * 1000;
    if (serverNow() - deadline < TIMES_UP_SFX_WINDOW_MS) {
      playTimesUp(answerTimedOut.startedAt);
    }
  }, [answerTimedOut, answerTimeSec, playTimesUp]);

  if (!answerTimedOut) return null;
  const name =
    players.get(answerTimedOut.userId)?.name ?? t("play.winningBuzzer");
  const tv = variant === "tv";
  return (
    <div
      className="flex flex-col items-center px-4 pb-2 text-center"
      data-testid="times-up-notice"
      role="status"
    >
      <p
        className={clsx(
          "font-bold text-red-300 uppercase",
          tv ? "text-3xl lg:text-5xl" : "text-xl",
        )}
      >
        {t("play.answerTimer.timesUp")}
      </p>
      <p className={clsx("text-white", tv && "text-2xl lg:text-4xl")}>
        {t("play.answerTimer.ranOutOfTime", { name })}
      </p>
    </div>
  );
}
