import clsx from "clsx";
import { produce } from "immer";
import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import { SadFile } from "~/components/icons";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  CLUE_TIMEOUT_MS,
  GameState,
  QUANTIZATION_FACTOR_MS,
  useEngineContext,
} from "~/engine";
import useFitText from "~/utils/use-fit-text";
import { useIsHost } from "~/utils/use-room-mode";
import useKeyPress from "~/utils/use-key-press";
import useSoloAction from "~/utils/use-solo-action";
import useGameSound from "~/utils/use-sound";
import useTimeout from "~/utils/use-timeout";

import { ConnectedAnswerForm as AnswerForm } from "./answer-form";
import { Buzzes } from "./buzz";
import { ConnectedCheckForm as CheckForm } from "./check-form";
import { Countdown } from "./countdown";
import { Fade } from "./fade";
import { HostModeAnswer, HostModeCheckForm } from "./host-mode";
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
      <SadFile className="h-10 w-10" title={badSrc} />
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
  const { fontSize, ref } = useFitText<HTMLParagraphElement>({
    maxFontSize: 200,
  });
  const [imageError, setImageError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Detect broken images that fail without firing onError (e.g. CSP blocks in Safari)
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImageError(true);
    }
  }, [imageSrc]);

  return (
    <button
      type="button"
      disabled={!canBuzz}
      onClick={() => onBuzz(Date.now())}
      className="flex w-screen grow flex-col items-center justify-center p-4"
      autoFocus={focusOnBuzz}
    >
      <p
        className={`mx-auto max-h-96 w-full max-w-screen-lg font-korinna leading-normal font-bold text-white uppercase transition-opacity duration-150 text-shadow-lg word-spacing-1`}
        ref={ref}
        style={{ fontSize, opacity: fontSize ? 1 : 0 }}
      >
        {clue}
        <br />
        <span
          className={clsx("text-cyan-300", {
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
            ref={imgRef}
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
  const { ref, fontSize } = useFitText<HTMLDivElement>({ maxFontSize: 300 });
  const isHost = useIsHost();

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
        className="flex w-screen grow items-center justify-center transition-opacity duration-150"
        ref={ref}
        style={{ fontSize, opacity: fontSize ? 1 : 0 }}
      >
        {longForm ? (
          <div className="mx-auto flex max-h-96 max-w-screen-lg flex-col p-4">
            <ShinyText text="final clue" />
            <p className="text-center font-korinna font-bold break-words text-white uppercase text-shadow-md">
              {category}
            </p>
          </div>
        ) : (
          <div className="relative p-4">
            <ShinyText text="double down" />
            {/* Hidden absolute element keeps shiny text from overflowing its grid */}
            <p className="invisible absolute top-0 left-0 p-4 text-center font-black text-white uppercase">
              double down
            </p>
          </div>
        )}
      </div>
      {isHost && clue ? (
        <HostModeAnswer answer={clue.answer} />
      ) : canWager ? (
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
  const isHost = useIsHost();

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
    if (isHost) return;
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
          {isHost ? (
            "Host mode - buzzing disabled"
          ) : (
            <>
              Click or press <Kbd>Enter</Kbd> to buzz in
            </>
          )}
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={!isHost && boardControl === userId}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz={!isHost}
        imageSrc={clue.imageSrc}
        showAnswer={false}
        answer={clue.answer}
      />
      {isHost && <HostModeAnswer answer={clue.answer} />}
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
  const isHost = useIsHost();

  if (!clue) throw new Error("No clue found");
  const numCharactersInClue = clue.clue.length ?? 0;

  // Compute clueDurationMs once at mount so the ReadClueTimer CSS animation
  // doesn't restart when server buzz events arrive mid-animation. The
  // component remounts between ReadClue phases, so this captures the right
  // value for re-reads (after a wrong answer) too.
  const [clueDurationMs] = React.useState(() => {
    const hasLockedOut =
      !clue.wagerable &&
      Array.from(buzzes.values()).some((b) => b === CANT_BUZZ_FLAG);
    return hasLockedOut
      ? READ_REOPENED_MS
      : READ_BASE_MS + READ_PER_CHAR_MS * numCharactersInClue;
  });

  const [optimisticBuzzes, setOptimisticBuzzes] = React.useState(buzzes);
  const myBuzzDurationMs = optimisticBuzzes.get(userId);

  // Initialize timestamps once at mount. The component remounts between
  // ReadClue phases, so these capture the right values for each phase.
  const [clueShownAt] = React.useState(() =>
    myBuzzDurationMs !== undefined ? 0 : Date.now(),
  );

  const [buzzerOpenAt, setBuzzerOpenAt] = React.useState<number | undefined>(
    myBuzzDurationMs !== undefined ? 0 : undefined,
  );

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const submit = fetcher.submit;

  /** submitBuzz submits a buzz of deltaMs to the server. */
  const submitBuzz = React.useCallback(
    (deltaMs: number) => {
      const [i, j] = activeClue ?? [-1, -1];
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

  // Update optimisticBuzzes once buzzes come in from the server.
  // If another player buzzed in, give us the remaining quantization window to
  // buzz (so near-simultaneous buzzes can still tie), then submit a timeout.
  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (buzzerOpenAt && myBuzzDurationMs === undefined) {
      const deltaMs = Date.now() - buzzerOpenAt;
      for (const [buzzUserId, buzz] of buzzes) {
        if (buzzUserId !== userId && buzz !== CANT_BUZZ_FLAG) {
          // How much of the quantization window is left for us to buzz.
          // If we buzz within this window, our buzz is in the same bucket
          // and clients will resolve the tie.
          const remainingMs = Math.max(
            0,
            buzz + QUANTIZATION_FACTOR_MS - deltaMs,
          );
          timeout = setTimeout(
            () => submitBuzz(CLUE_TIMEOUT_MS + 1),
            remainingMs,
          );
          break;
        }
      }
    }
    // Merge server buzzes with our optimistic buzz. If we submitted a buzz
    // locally but the server hasn't echoed it back yet, preserve our local
    // value so shouldAnimate doesn't flicker (which would restart the
    // ReadClueTimer CSS animation from scratch).
    setOptimisticBuzzes((prev) => {
      const myPrevBuzz = prev.get(userId);
      const myServerBuzz = buzzes.get(userId);
      if (myPrevBuzz !== undefined && myServerBuzz === undefined) {
        const merged = new Map(buzzes);
        merged.set(userId, myPrevBuzz);
        return merged;
      }
      return buzzes;
    });
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [buzzes, buzzerOpenAt, myBuzzDurationMs, userId, submitBuzz]);

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
    if (isHost || lockout || myBuzzDurationMs !== undefined) {
      return;
    }

    const lockoutDeltaMs = clickedAtMs - clueShownAt;
    if (lockoutDeltaMs < clueDurationMs) {
      return onLockout();
    }

    if (buzzerOpenAt === undefined || !activeClue) {
      return;
    }

    // Contestant buzzed, so submit their buzz time
    const deltaMs = clickedAtMs - buzzerOpenAt;

    setOptimisticBuzzes(produce((draft) => draft.set(userId, deltaMs)));

    return submitBuzz(deltaMs);
  }

  useKeyPress("Enter", () => handleClick(Date.now()));

  const clueValue = activeClue ? getClueValue(activeClue, userId) : 0;

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
          {isHost ? (
            "Host mode - buzzing disabled"
          ) : (
            <>
              Click or press <Kbd>Enter</Kbd> to buzz in
            </>
          )}
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={!isHost && !lockout && myBuzzDurationMs === undefined}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz={!isHost}
        imageSrc={clue.imageSrc}
        showAnswer={false}
        answer={clue.answer}
      />
      {isHost ? (
        <HostModeAnswer answer={clue.answer} />
      ) : (
        <div className="invisible">
          <CheckForm
            roomId={roomId}
            userId={userId}
            showAnswer={false}
            onClickShowAnswer={() => null}
          />
        </div>
      )}
      <Countdown startTime={undefined} />
      <Buzzes buzzes={optimisticBuzzes} />
    </>
  );
}

/** ReadLongFormCluePrompt handles all frontend behavior while the game state is
 * GameState.ReadLongFormClue.
 */
function ReadLongFormCluePrompt({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    soloDispatch,
  } = useEngineContext();
  const isHost = useIsHost();
  if (!clue) throw new Error("clue is undefined");

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const myBuzzDurationMs = buzzes.get(userId);
  const canAnswer = myBuzzDurationMs !== CANT_BUZZ_FLAG;
  const allPlayersCantAnswer =
    buzzes.size === players.size &&
    Array.from(buzzes.values()).every((b) => b === CANT_BUZZ_FLAG);

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
      {isHost ? (
        <HostModeAnswer answer={clue.answer} />
      ) : canAnswer ? (
        <AnswerForm roomId={roomId} userId={userId} />
      ) : allPlayersCantAnswer ? (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="font-bold text-white">
            No one has enough money to wager, but give the clue a read!
          </p>
          <NextClueForm roomId={roomId} userId={userId} />
        </div>
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
function RevealAnswerToBuzzerPrompt({
  roomId,
  userId,
  hostMode,
}: RoomProps & { hostMode: boolean }) {
  const { activeClue, category, clue, getClueValue, players, winningBuzzer } =
    useEngineContext();
  const isHost = useIsHost();
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
    canShowAnswer && !showAnswer && !hostMode ? CLUE_TIMEOUT_MS : null,
  );
  const [countdownStartedAt] = React.useState(
    canShowAnswer && !showAnswer && !hostMode ? Date.now() : undefined,
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
      {isHost ? (
        <>
          <HostModeAnswer answer={clue.answer} />
          <HostModeCheckForm roomId={roomId} />
        </>
      ) : hostMode ? (
        <p className="p-2 text-center font-bold text-white">
          Waiting for the host to verify {winningPlayerName}...
        </p>
      ) : canShowAnswer ? (
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

function RevealAnswerLongFormPrompt({
  roomId,
  userId,
  hostMode,
}: RoomProps & { hostMode: boolean }) {
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
  const isHost = useIsHost();
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
      {isHost ? (
        <>
          <HostModeAnswer answer={clue.answer} />
          <HostModeCheckForm roomId={roomId} longForm />
        </>
      ) : hostMode ? (
        <p className="p-2 text-center font-bold text-white">
          Waiting for the host to verify answers...
        </p>
      ) : canCheckAnswer ? (
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
  const isHost = useIsHost();
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
          {isHost ? (
            "Host mode - buzzing disabled"
          ) : (
            <>
              Click or press <Kbd>Enter</Kbd> to buzz in
            </>
          )}
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
      {isHost && <HostModeAnswer answer={clue.answer} />}
      <NextClueForm roomId={roomId} userId={userId} />
      <Countdown startTime={undefined} />
      <Buzzes />
    </>
  );
}

export function ConnectedPrompt(
  props: RoomProps & { hostMode: boolean },
) {
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
        className={`relative flex w-screen flex-col justify-between overflow-x-hidden overflow-y-scroll bg-blue-bright`}
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
