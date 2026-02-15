import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import { produce } from "immer";
import * as React from "react";
import useFitText from "use-fit-text";

import type { RoomProps } from "~/components/game";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  GameState,
  QUANTIZATION_FACTOR_MS,
  useEngineContext,
} from "~/engine";
import useKeyPress from "~/utils/use-key-press";
import useSoloAction from "~/utils/use-solo-action";
import useGameSound from "~/utils/use-sound";
import useTimeout from "~/utils/use-timeout";

import { ConnectedAnswerForm as AnswerForm } from "./answer-form";
import { Buzzes } from "./buzz";
import { ConnectedCheckForm as CheckForm } from "./check-form";
import { Countdown } from "./countdown";
import { Fade } from "./fade";
import { Kbd } from "./kbd";
import { Lockout } from "./lockout";
import { ConnectedNextClueForm as NextClueForm } from "./next-clue-form";
import { ReadClueTimer } from "./read-clue-timer";
import ShinyText from "./shiny-text";
import { ConnectedWagerForm as WagerForm } from "./wager-form";

/** READ_PER_CHAR_MS is the number of milliseconds to "read" each character of
 * the clue before the buzzer opens. Longer clues should take longer to read.
 */
const READ_PER_CHAR_MS = 60;

/** READ_BASE_MS is the base amount of time it takes to read a clue.
 */
const READ_BASE_MS = 1000;

/** READ_REOPENED_MS is the amount of time to "re-read" the clue after a
 * failed buzz before re-opening the buzzers.
 */
const READ_REOPENED_MS = 1000;

/** LOCKOUT_MS applies a 250ms lockout if a contestant buzzes before the clue is
 * done being read.
 */
const LOCKOUT_MS = 250;

const LONG_FORM_CLUE_DURATION_SEC = 30;
const TIMES_UP_SFX = "/sounds/times-up.mp3";
const LONG_FORM_SFX = "/sounds/long-form.mp3";

function SadFileIcon({ badSrc }: { badSrc: string }) {
  return (
    <div className="flex items-center justify-center border border-white p-4 text-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 72 87"
        shape-rendering="crispEdges"
        className="h-10 w-10"
        role="img"
        aria-labelledby="sad-file-title"
      >
        <title id="sad-file-title">{badSrc}</title>
        <path
          stroke="currentColor"
          d="M0 0h51M0 1h51M0 2h51M0 3h51M0 4h51M0 5h51M0 6h51M0 7h7M37 7h7M51 7h7M0 8h7M37 8h7M51 8h7M0 9h7M37 9h7M51 9h7M0 10h7M37 10h7M51 10h7M0 11h7M37 11h7M51 11h7M0 12h7M37 12h7M51 12h7M0 13h7M37 13h7M51 13h7M0 14h7M37 14h7M58 14h7M0 15h7M37 15h7M58 15h7M0 16h7M37 16h7M58 16h7M0 17h7M37 17h7M58 17h7M0 18h7M37 18h7M58 18h7M0 19h7M37 19h7M58 19h7M0 20h7M37 20h7M58 20h7M0 21h7M18 21h7M37 21h7M65 21h7M0 22h7M18 22h7M37 22h7M65 22h7M0 23h7M18 23h7M37 23h7M65 23h7M0 24h7M18 24h7M37 24h7M65 24h7M0 25h7M18 25h7M37 25h7M65 25h7M0 26h7M18 26h7M37 26h7M65 26h7M0 27h7M18 27h7M37 27h7M65 27h7M0 28h7M18 28h7M37 28h35M0 29h7M18 29h7M37 29h35M0 30h7M18 30h7M37 30h35M0 31h7M18 31h7M37 31h35M0 32h7M18 32h7M37 32h35M0 33h7M18 33h7M37 33h35M0 34h7M18 34h7M37 34h35M0 35h7M65 35h7M0 36h7M65 36h7M0 37h7M65 37h7M0 38h7M65 38h7M0 39h7M65 39h7M0 40h7M65 40h7M0 41h7M65 41h7M0 42h7M65 42h7M0 43h7M65 43h7M0 44h7M65 44h7M0 45h7M65 45h7M0 46h7M65 46h7M0 47h7M65 47h7M0 48h7M65 48h7M0 49h7M65 49h7M0 50h7M65 50h7M0 51h7M65 51h7M0 52h7M65 52h7M0 53h7M65 53h7M0 54h7M65 54h7M0 55h7M65 55h7M0 56h7M25 56h22M65 56h7M0 57h7M25 57h22M65 57h7M0 58h7M25 58h22M65 58h7M0 59h7M25 59h22M65 59h7M0 60h7M25 60h22M65 60h7M0 61h7M25 61h22M65 61h7M0 62h7M25 62h22M65 62h7M0 63h7M18 63h7M47 63h7M65 63h7M0 64h7M18 64h7M47 64h7M65 64h7M0 65h7M18 65h7M47 65h7M65 65h7M0 66h7M18 66h7M47 66h7M65 66h7M0 67h7M18 67h7M47 67h7M65 67h7M0 68h7M18 68h7M47 68h7M65 68h7M0 69h7M18 69h7M47 69h7M65 69h7M0 70h7M65 70h7M0 71h7M65 71h7M0 72h7M65 72h7M0 73h7M65 73h7M0 74h7M65 74h7M0 75h7M65 75h7M0 76h7M65 76h7M0 77h7M65 77h7M0 78h7M65 78h7M0 79h7M65 79h7M0 80h72M0 81h72M0 82h72M0 83h72M0 84h72M0 85h72M0 86h72"
        />
      </svg>
    </div>
  );
}

function ClueText({
  answer,
  canBuzz,
  clue,
  focusOnBuzz,
  onBuzz,
  showAnswer,
  imageSrc,
}: {
  answer: string;
  canBuzz: boolean;
  clue: string;
  focusOnBuzz: boolean;
  onBuzz: (buzzedAt: number) => void;
  showAnswer: boolean;
  imageSrc?: string;
}) {
  const { fontSize, ref } = useFitText({ minFontSize: 20, maxFontSize: 400 });
  const [imageError, setImageError] = React.useState(false);

  return (
    <button
      type="button"
      disabled={!canBuzz}
      onClick={() => onBuzz(Date.now())}
      className="flex w-screen grow flex-col items-center justify-center p-4"
      autoFocus={focusOnBuzz}
    >
      <p
        className={`text-shadow-lg word-spacing-1 mx-auto max-h-96 w-full
        max-w-screen-lg font-korinna font-bold uppercase leading-normal
        text-white`}
        ref={ref}
        style={{ fontSize }}
      >
        {clue}
        <br />
        <span
          className={classNames("text-cyan-300", {
            invisible: !showAnswer,
          })}
        >
          {answer}
        </span>
      </p>
      {imageSrc ? (
        imageError ? (
          <SadFileIcon badSrc={imageSrc} />
        ) : (
          <img
            src={imageSrc}
            alt={`Image for clue: ${clue}`}
            onError={() => setImageError(true)}
          />
        )
      ) : null}
    </button>
  );
}

/** WagerCluePrompt handles all frontend behavior while the game state is
 * GameState.WagerClue.
 */
function WagerCluePrompt({ roomId, userId }: RoomProps) {
  const { clue, boardControl, buzzes, category, players } = useEngineContext();
  const { ref, fontSize } = useFitText({ minFontSize: 20, maxFontSize: 600 });

  const canWager = buzzes.get(userId) !== CANT_BUZZ_FLAG;
  const wagererName = boardControl
    ? (players.get(boardControl)?.name ?? "winning buzzer")
    : "winning buzzer";
  const longForm = clue?.longForm ?? false;

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={canWager}
      />
      {longForm ? null : (
        <div className="p-4 text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clue?.value}</span>
        </div>
      )}
      <div
        className="flex w-screen grow items-center justify-center"
        ref={ref}
        style={{ fontSize }}
      >
        {longForm ? (
          <div className="mx-auto flex max-h-96 max-w-screen-lg flex-col p-4">
            <ShinyText text="final clue" />
            <p className="text-shadow-md break-words text-center font-korinna font-bold uppercase text-white">
              {category}
            </p>
          </div>
        ) : (
          <div className="relative p-4">
            <ShinyText text="double down" />
            {/* Hidden absolute element keeps shiny text from overflowing its grid */}
            <p className="invisible absolute left-0 top-0 p-4 text-center font-black uppercase text-white">
              double down
            </p>
          </div>
        )}
      </div>
      {canWager ? (
        <WagerForm roomId={roomId} userId={userId} />
      ) : longForm ? (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="font-bold text-white">
            You do not have enough money to wager on this clue.
          </p>
          <p className="text-sm text-slate-300">
            Waiting for others to submit wagers...
          </p>
        </div>
      ) : (
        <p className="p-2 text-center font-bold text-white">
          Waiting for response from {wagererName}...
        </p>
      )}
      <Countdown startTime={undefined} />
      <Buzzes />
    </>
  );
}

/** ReadWagerableCluePrompt handles all frontend behavior while the game
 * state is GameState.ReadWagerableClue.
 */
function ReadWagerableCluePrompt({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    boardControl,
    buzzes,
    category,
    clue,
    getClueValue,
    soloDispatch,
  } = useEngineContext();

  if (!boardControl) throw new Error("No board control found");
  if (!clue) throw new Error("No clue found");
  if (!activeClue) throw new Error("No active clue found");

  const buzzDurationMs = buzzes.get(boardControl);
  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>(
    buzzDurationMs !== undefined ? 0 : undefined,
  );

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const submit = fetcher.submit;

  const numCharactersInClue = clue.clue.length ?? 0;
  const clueDurationMs = READ_BASE_MS + READ_PER_CHAR_MS * numCharactersInClue;

  /** submitBuzz submits a buzz of deltaMs to the server. */
  const submitBuzz = React.useCallback(
    (deltaMs: number) => {
      const [i, j] = activeClue;
      return submit(
        {
          i: i.toString(),
          j: j.toString(),
          userId,
          deltaMs: deltaMs.toString(),
        },
        { method: "post", action: `/room/${roomId}/buzz` },
      );
    },
    [submit, roomId, userId, activeClue],
  );

  // Open the buzzer after the clue is done being "read".
  const delayMs = buzzDurationMs === undefined ? clueDurationMs : null;
  useTimeout(() => setBuzzerOpenAt(Date.now()), delayMs);

  // If the player with board control does nothing for 5 seconds after the
  // buzzer opens, close the buzzer and send a 5-second timeout to the server.
  useTimeout(
    () => {
      if (!buzzerOpenAt) return;
      submitBuzz(CLUE_TIMEOUT_MS + 1);
    },
    buzzerOpenAt !== undefined && boardControl === userId
      ? CLUE_TIMEOUT_MS + 1
      : null,
  );

  // Play the "time's up" sound after 5 seconds if no one buzzed in after the
  // buzzer opened.
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  useTimeout(
    playTimesUpSfx,
    buzzerOpenAt === undefined || buzzDurationMs ? null : CLUE_TIMEOUT_MS,
  );

  const handleClick = (clickedAtMs: number) => {
    if (buzzDurationMs !== undefined || buzzerOpenAt === undefined) {
      return;
    }

    // Contestant buzzed, so submit their buzz time
    return submitBuzz(clickedAtMs - buzzerOpenAt);
  };

  useKeyPress("Enter", () => handleClick(Date.now()));

  const clueValue = getClueValue(activeClue, boardControl);

  return (
    <>
      <ReadClueTimer
        clueDurationMs={clueDurationMs}
        shouldAnimate={buzzDurationMs === undefined}
        wonBuzz={
          buzzDurationMs !== undefined &&
          buzzDurationMs !== CANT_BUZZ_FLAG &&
          buzzDurationMs <= CLUE_TIMEOUT_MS
        }
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clue.value}</span> (wagered{" "}
          <span className="font-bold">${clueValue}</span>)
        </div>
        <span className="text-sm text-slate-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={boardControl === userId}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz
        imageSrc={clue.imageSrc}
        showAnswer={false}
        answer={clue.answer}
      />
      <Countdown startTime={undefined} />
      <Buzzes buzzes={buzzes} />
    </>
  );
}

/** ReadCluePrompt handles all frontend behavior while the game state is
 * GameState.ReadClue.
 */
function ReadCluePrompt({
  roomId,
  userId,
  lockout,
  onLockout,
}: RoomProps & { lockout: boolean; onLockout: () => void }) {
  const { activeClue, buzzes, category, clue, getClueValue, soloDispatch } =
    useEngineContext();

  const [optimisticBuzzes, setOptimisticBuzzes] = React.useState(buzzes);
  const myBuzzDurationMs = optimisticBuzzes.get(userId);

  const [clueShownAt, setClueShownAt] = React.useState<number | undefined>(
    myBuzzDurationMs !== undefined ? 0 : undefined,
  );
  const [clueIdx, setClueIdx] = React.useState(activeClue);

  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>(
    myBuzzDurationMs !== undefined ? 0 : undefined,
  );

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const submit = fetcher.submit;

  if (!clue) throw new Error("No clue found");
  const numCharactersInClue = clue.clue.length ?? 0;

  // If we are reopening the buzzers after a wrong answer, delay a fixed amount
  // of time before re-opening the buzzers.
  const hasLockedOutBuzzers =
    !clue.wagerable &&
    Array.from(optimisticBuzzes.values()).some((b) => b === CANT_BUZZ_FLAG);
  const clueDurationMs = hasLockedOutBuzzers
    ? READ_REOPENED_MS
    : READ_BASE_MS + READ_PER_CHAR_MS * numCharactersInClue;

  // Keep activeClue set to the last valid clue index.
  React.useEffect(() => {
    if (activeClue) {
      setClueShownAt(Date.now());
      setClueIdx(activeClue);
      setBuzzerOpenAt(myBuzzDurationMs !== undefined ? 0 : undefined);
    } else {
      setClueShownAt(undefined);
      setBuzzerOpenAt(undefined);
    }
  }, [activeClue, myBuzzDurationMs]);

  /** submitBuzz submits a buzz of deltaMs to the server. */
  const submitBuzz = React.useCallback(
    (deltaMs: number) => {
      const [i, j] = clueIdx ?? [-1, -1];
      return submit(
        {
          i: i.toString(),
          j: j.toString(),
          userId,
          deltaMs: deltaMs.toString(),
        },
        { method: "post", action: `/room/${roomId}/buzz` },
      );
    },
    [submit, roomId, userId, clueIdx],
  );

  // Update optimisticBuzzes once buzzes come in from the server.
  React.useEffect(() => {
    // If a new buzz comes in that's less than the current deltaMs, submit a
    // timeout buzz.
    if (buzzerOpenAt) {
      const deltaMs = Date.now() - buzzerOpenAt;
      for (const [buzzUserId, buzz] of buzzes) {
        if (
          buzzUserId !== userId &&
          buzz !== CANT_BUZZ_FLAG &&
          buzz + QUANTIZATION_FACTOR_MS < deltaMs
        ) {
          submitBuzz(CLUE_TIMEOUT_MS + 1);
        }
      }
    }
    setOptimisticBuzzes(buzzes);
  }, [buzzes, buzzerOpenAt, userId, submitBuzz]);

  // Open the buzzer after the clue is done being "read".
  const delayMs = myBuzzDurationMs === undefined ? clueDurationMs : null;
  useTimeout(() => setBuzzerOpenAt(Date.now()), delayMs);

  // If nothing happens for 5 seconds after the buzzer opens, close the buzzer
  // and send a 5-second "non-buzz" buzz to the server.
  useTimeout(
    () => {
      if (!buzzerOpenAt) return;
      setOptimisticBuzzes(
        produce((draft) => {
          const prev = draft.get(userId);
          if (prev) {
            return;
          }
          draft.set(userId, CLUE_TIMEOUT_MS + 1);
        }),
      );
      submitBuzz(CLUE_TIMEOUT_MS + 1);
    },
    buzzerOpenAt === undefined ? null : CLUE_TIMEOUT_MS + 1,
  );

  // Play the "time's up" sound after 5 seconds if no one buzzed in after the
  // buzzer opened.
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  const someoneBuzzed = Array.from(optimisticBuzzes.values()).some(
    (v) => v !== CANT_BUZZ_FLAG && v <= CLUE_TIMEOUT_MS,
  );
  useTimeout(
    playTimesUpSfx,
    buzzerOpenAt === undefined || someoneBuzzed ? null : CLUE_TIMEOUT_MS,
  );

  function handleClick(clickedAtMs: number) {
    if (
      clueShownAt === undefined ||
      lockout ||
      myBuzzDurationMs !== undefined
    ) {
      return;
    }

    const lockoutDeltaMs = clickedAtMs - clueShownAt;
    if (lockoutDeltaMs < clueDurationMs) {
      return onLockout();
    }

    if (buzzerOpenAt === undefined || !clueIdx) {
      return;
    }

    // Contestant buzzed, so submit their buzz time
    const deltaMs = clickedAtMs - buzzerOpenAt;

    setOptimisticBuzzes(produce((draft) => draft.set(userId, deltaMs)));

    return submitBuzz(deltaMs);
  }

  useKeyPress("Enter", () => handleClick(Date.now()));

  const clueValue = clueIdx ? getClueValue(clueIdx, userId) : 0;

  return (
    <>
      <ReadClueTimer
        clueDurationMs={clueDurationMs}
        shouldAnimate={myBuzzDurationMs === undefined}
        wonBuzz={
          myBuzzDurationMs !== undefined &&
          myBuzzDurationMs !== CANT_BUZZ_FLAG &&
          myBuzzDurationMs <= CLUE_TIMEOUT_MS
        }
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-slate-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={!lockout && myBuzzDurationMs === undefined}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz
        imageSrc={clue.imageSrc}
        showAnswer={false}
        answer={clue.answer}
      />
      <div className="invisible">
        <CheckForm
          roomId={roomId}
          userId={userId}
          showAnswer={false}
          onClickShowAnswer={() => null}
        />
      </div>
      <Countdown startTime={undefined} />
      <Buzzes buzzes={optimisticBuzzes} />
    </>
  );
}

/** ReadLongFormCluePrompt handles all frontend behavior while the game state is
 * GameState.ReadLongFormClue.
 */
function ReadLongFormCluePrompt({ roomId, userId }: RoomProps) {
  const { activeClue, buzzes, category, clue, getClueValue, soloDispatch } =
    useEngineContext();
  if (!clue) throw new Error("clue is undefined");

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const myBuzzDurationMs = buzzes.get(userId);
  const canAnswer = myBuzzDurationMs !== CANT_BUZZ_FLAG;

  const [countdownStartedAt] = React.useState(
    myBuzzDurationMs === undefined ? Date.now() : undefined,
  );

  // Play the long form sound when the component mounts.
  const [playLongFormSfx, { stop }] = useGameSound(LONG_FORM_SFX);
  React.useEffect(() => {
    playLongFormSfx();
    return () => stop();
  }, [playLongFormSfx, stop]);

  const clueValue = activeClue ? getClueValue(activeClue, userId) : 0;

  return (
    <>
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={false}
        onBuzz={() => null}
        focusOnBuzz={false}
        imageSrc={clue.imageSrc}
        showAnswer={false}
        answer={clue.answer}
      />
      {canAnswer ? (
        <AnswerForm roomId={roomId} userId={userId} />
      ) : (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="text-sm text-slate-300">
            Waiting for others to answer...
          </p>
        </div>
      )}
      <Countdown
        startTime={countdownStartedAt}
        durationSec={LONG_FORM_CLUE_DURATION_SEC}
      />
      <Buzzes />
    </>
  );
}

/** RevealAnswerToBuzzerPrompt handles all frontend behavior while the game state
 * is GameState.RevealAnswerToBuzzer.
 */
function RevealAnswerToBuzzerPrompt({ roomId, userId }: RoomProps) {
  const { activeClue, category, clue, getClueValue, players, winningBuzzer } =
    useEngineContext();
  if (!clue) throw new Error("clue is undefined");
  if (!activeClue) throw new Error("activeClue is undefined");
  if (!winningBuzzer) throw new Error("winningBuzzer is undefined");

  const clueValue = clue.wagerable
    ? getClueValue(activeClue, winningBuzzer)
    : getClueValue(activeClue, userId);

  const canShowAnswer = winningBuzzer === userId;
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Play the "time's up" sound after 5 seconds if the contestant can reveal the
  // answer but hasn't yet.
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  useTimeout(
    playTimesUpSfx,
    canShowAnswer && !showAnswer ? CLUE_TIMEOUT_MS : null,
  );
  const [countdownStartedAt] = React.useState(
    canShowAnswer && !showAnswer ? Date.now() : undefined,
  );

  const winningPlayerName = winningBuzzer
    ? (players.get(winningBuzzer)?.name ?? "winning buzzer")
    : "winning buzzer";

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={canShowAnswer}
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-slate-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        answer={clue.answer}
        canBuzz={false}
        clue={clue.clue}
        focusOnBuzz={false}
        imageSrc={clue.imageSrc}
        onBuzz={() => null}
        showAnswer={false}
      />
      {canShowAnswer ? (
        <CheckForm
          roomId={roomId}
          userId={userId}
          showAnswer={canShowAnswer && showAnswer}
          onClickShowAnswer={
            canShowAnswer ? () => setShowAnswer(true) : () => null
          }
        />
      ) : (
        <p className="p-2 text-center font-bold text-white">
          Waiting for response from {winningPlayerName}...
        </p>
      )}
      <Countdown startTime={showAnswer ? undefined : countdownStartedAt} />
      <Buzzes />
    </>
  );
}

function RevealAnswerLongFormPrompt({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    answers,
    answeredBy,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
  } = useEngineContext();
  if (!clue) throw new Error("clue is undefined");
  if (!activeClue) throw new Error("activeClue is undefined");

  const clueValue = getClueValue(activeClue, userId);
  const buzzDurationMs = buzzes.get(userId);
  const canCheckAnswer =
    buzzDurationMs !== undefined && buzzDurationMs !== CANT_BUZZ_FLAG;

  const playersList = Array.from(players.values()).map((p) => ({
    name: p.name,
    userId: p.userId,
    answer: answers.get(p.userId),
  }));

  const [i, j] = activeClue;

  const unansweredPlayers = Array.from(answers.keys())
    .map((uid) => players.get(uid))
    .filter((p): p is Player => p !== undefined)
    .filter((p) => answeredBy(i, j, p.userId) === undefined);

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={canCheckAnswer}
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-slate-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>
      <ClueText
        answer={clue.answer}
        canBuzz={false}
        clue={clue.clue}
        focusOnBuzz={false}
        imageSrc={clue.imageSrc}
        onBuzz={() => null}
        showAnswer
      />
      {canCheckAnswer ? (
        <CheckForm
          roomId={roomId}
          userId={userId}
          showAnswer
          longForm={true}
          onClickShowAnswer={() => null}
        />
      ) : (
        <p className="p-2 text-center text-sm text-slate-300">
          Waiting for checks from{" "}
          {unansweredPlayers.map((p) => p.name).join(", ")}...
        </p>
      )}
      <div className="flex w-full gap-2 overflow-x-scroll">
        {playersList.map(({ name, userId, answer }) => {
          return (
            <div
              className="flex flex-col items-center justify-between"
              key={userId}
            >
              <p className="text-center font-handwriting text-xl font-bold text-white">
                {name}
              </p>
              {answer ? (
                <p className="text-white">{answer}</p>
              ) : (
                <p className="text-sm text-slate-300">[no answer]</p>
              )}
            </div>
          );
        })}
      </div>
      <Countdown
        startTime={undefined}
        durationSec={LONG_FORM_CLUE_DURATION_SEC}
      />
      <Buzzes />
    </>
  );
}

/** RevealAnswerToAllPrompt handles all frontend behavior while the game state is
 * GameState.ReadAnswerToAll.
 */
function RevealAnswerToAllPrompt({ roomId, userId }: RoomProps) {
  const { activeClue, answeredBy, category, clue, getClueValue } =
    useEngineContext();
  if (!clue) throw new Error("clue is undefined");

  const clueValue = activeClue ? getClueValue(activeClue, userId) : 0;
  const wonBuzz = activeClue
    ? answeredBy(activeClue[0], activeClue[1], userId) === true
    : false;

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={wonBuzz}
      />
      <div className="flex justify-between p-4">
        <div className="text-white">
          <span className="font-bold">{category}</span> for{" "}
          <span className="font-bold">${clueValue}</span>
        </div>
        <span className="text-sm text-slate-300">
          Click or press <Kbd>Enter</Kbd> to buzz in
        </span>
      </div>

      <ClueText
        clue={clue.clue}
        canBuzz={false}
        onBuzz={() => null}
        focusOnBuzz={false}
        imageSrc={clue.imageSrc}
        showAnswer
        answer={clue.answer}
      />
      <NextClueForm roomId={roomId} userId={userId} />
      <Countdown startTime={undefined} />
      <Buzzes />
    </>
  );
}

export function ConnectedPrompt(props: RoomProps) {
  const { type } = useEngineContext();

  const [lockout, setLockout] = React.useState(false);

  // Remove the lockout after 500ms.
  useTimeout(() => setLockout(false), lockout ? LOCKOUT_MS : null);

  function getPromptContent() {
    switch (type) {
      case GameState.WagerClue:
        return <WagerCluePrompt {...props} />;
      case GameState.ReadClue:
        return (
          <ReadCluePrompt
            {...props}
            lockout={lockout}
            onLockout={() => setLockout(true)}
          />
        );
      case GameState.ReadWagerableClue:
        return <ReadWagerableCluePrompt {...props} />;
      case GameState.ReadLongFormClue:
        return <ReadLongFormCluePrompt {...props} />;
      case GameState.RevealAnswerToBuzzer:
        return <RevealAnswerToBuzzerPrompt {...props} />;
      case GameState.RevealAnswerLongForm:
        return <RevealAnswerLongFormPrompt {...props} />;
      case GameState.RevealAnswerToAll:
        return <RevealAnswerToAllPrompt {...props} />;
      default:
        return null;
    }
  }

  const promptContent = getPromptContent();
  const isOpen = promptContent !== null;

  return (
    <Fade show={isOpen}>
      <div
        className={`relative flex w-screen flex-col justify-between
        overflow-x-hidden overflow-y-scroll bg-blue-bright`}
        style={{
          height: "100dvh",
        }}
      >
        <Lockout active={lockout} />
        {promptContent}
      </div>
    </Fade>
  );
}
