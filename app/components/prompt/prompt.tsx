import clsx from "clsx";
import { produce } from "immer";
import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import type { Action, Player } from "~/engine";
import {
  CANT_BUZZ_FLAG,
  GameState,
  QUANTIZATION_FACTOR_MS,
  useEngineContext,
} from "~/engine";
import { getBuzzWindowMs, getNoBuzzMs } from "~/engine/room-timers";
import { getSecretTopic, isSecretClue } from "~/engine/state";
import { useTranslation } from "~/i18n";
import type { Clue } from "~/models/convert.server";
import { hasChoices } from "~/utils/choices";
import type { MediaBlock } from "~/utils/media";
import { getClueMedia, getRoomReadMs, hasPlayableMedia } from "~/utils/media";
import useFitText from "~/utils/use-fit-text";
import useKeyPress from "~/utils/use-key-press";
import useSoloAction from "~/utils/use-solo-action";
import useGameSound from "~/utils/use-sound";
import useTimeout from "~/utils/use-timeout";
import { useSoundSettings } from "~/utils/user-settings";

import { ConnectedAnswerForm as AnswerForm } from "./answer-form";
import {
  ConnectedAnswerTimer,
  TimesUpNotice,
  useAnswerTimer,
  useAutoWrongOnTimeout,
} from "./answer-timer";
import { Buzzes } from "./buzz";
import { BuzzButton, getBuzzButtonState, isBuzzBarShown } from "./buzz-button";
import { ConnectedCheckForm as CheckForm } from "./check-form";
import { ConnectedChoiceList, ConnectedChoicePicker } from "./choices";
import { ClueImage, PlayableMedia } from "./clue-media";
import { Countdown } from "./countdown";
import { Fade } from "./fade";
import { Kbd } from "./kbd";
import { Lockout } from "./lockout";
import { ConnectedNextClueForm as NextClueForm } from "./next-clue-form";
import { ConnectedPassCluePrompt } from "./pass-clue";
import { ReadClueTimer } from "./read-clue-timer";
import ShinyText from "./shiny-text";
import {
  FinalAnswerTimer,
  useFinalAnswerTimer,
  useWagerTimer,
  WagerTimer,
} from "./step-timers";
import { ConnectedWagerForm as WagerForm } from "./wager-form";

/** ANSWER_HINT_MS: without the answer timer, the buzz winner hears the
 * "time's up" sound after this long as a hint (nothing is enforced). */
const ANSWER_HINT_MS = 5000;

/** LOCKOUT_MS applies a 250ms lockout if a contestant buzzes before the clue is
 * done being read.
 */
const LOCKOUT_MS = 250;

const TIMES_UP_SFX = "/sounds/times-up.mp3";
const LONG_FORM_SFX = "/sounds/long-form.mp3";

function bold(chunks: React.ReactNode) {
  return <span className="font-bold">{chunks}</span>;
}

function kbd(chunks: React.ReactNode) {
  return <Kbd>{chunks}</Kbd>;
}

/** CategoryFor renders "<category> for $<value>" (and the wager, if any).
 * Game content (the category) is passed as a node, never interpolated into
 * the message. */
export function CategoryFor({
  category,
  value,
  wager,
}: {
  category: React.ReactNode;
  value: number;
  wager?: number;
}) {
  const { rich } = useTranslation();
  return (
    <div className="text-white">
      {wager === undefined
        ? rich("play.categoryFor", {
            category: <>{category}</>,
            value: `$${value}`,
            b: bold,
          })
        : rich("play.categoryForWagered", {
            category: <>{category}</>,
            value: `$${value}`,
            wager: `$${wager}`,
            b: bold,
          })}
    </div>
  );
}

/** useClueMedia returns `getClueMedia` with a translated alt text for legacy
 * `imageSrc` pictures. */
export function useClueMedia() {
  const { t } = useTranslation();
  return React.useCallback(
    (clue: Clue) =>
      getClueMedia(clue, (clueText) =>
        t("play.media.imageFor", { clue: clueText }),
      ),
    [t],
  );
}

/** revealMedia picks the media to show for a clue: once the answer is shown,
 * answer media (if any) replaces the clue media. */
export function revealMedia(
  clue: Clue,
  showAnswerMedia: boolean,
  clueMedia: (clue: Clue) => MediaBlock[],
): MediaBlock[] {
  if (showAnswerMedia && clue.answerMedia && hasAnswerMedia(clue)) {
    return clue.answerMedia;
  }
  return clueMedia(clue);
}

export function hasAnswerMedia(clue: Clue): boolean {
  return (clue.answerMedia?.length ?? 0) > 0;
}

export function ClueText({
  answer,
  canBuzz,
  clue,
  focusOnBuzz,
  onBuzz,
  showAnswer,
  media = [],
  autoPlayMedia = false,
  variant = "screen",
  touchBuzz = true,
}: {
  answer: string;
  canBuzz: boolean;
  clue: string;
  focusOnBuzz: boolean;
  onBuzz: (buzzedAt: number) => void;
  showAnswer: boolean;
  /** Pictures, audio and video shown with the clue (or answer). */
  media?: MediaBlock[];
  /** Try to start audio/video when it first appears. */
  autoPlayMedia?: boolean;
  /** "screen" fills the full-screen prompt; "tv" fills its container (the
   * presenter screen) and lets the text grow on big screens. */
  variant?: "screen" | "tv";
  /** false: taps with a finger or pen don't buzz while the big BUZZ button
   * is on screen (no accidental buzzes while scrolling or reading). Mouse
   * clicks and the keyboard still buzz. */
  touchBuzz?: boolean;
}) {
  const { fontSize, ref } = useFitText<HTMLParagraphElement>({
    maxFontSize: 200,
  });
  const pointerType = React.useRef("");
  // The host's replays of the question's audio/video (feature 23).
  const { mediaReplayCount } = useEngineContext();
  const images = media.filter((b) => b.type === "image");
  const hasMedia = media.length > 0;

  return (
    <div
      className={clsx(
        "flex min-h-0 grow flex-col items-center justify-center gap-2 pb-2",
        // On phones (short landscape screens especially) the prompt scrolls
        // instead of squeezing the media under the controls below.
        variant === "tv" ? "w-full" : "w-screen buzzbar:shrink-0",
      )}
    >
      <button
        type="button"
        disabled={!canBuzz}
        data-testid="clue-buzz-area"
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onClick={() => {
          const type = pointerType.current;
          pointerType.current = "";
          if (
            !touchBuzz &&
            (type === "touch" || type === "pen") &&
            isBuzzBarShown()
          ) {
            return;
          }
          onBuzz(Date.now());
        }}
        className={clsx(
          "flex w-full grow flex-col items-center justify-center gap-2 p-4",
          { "min-h-24": hasMedia },
        )}
        autoFocus={focusOnBuzz}
      >
        <p
          className={clsx(
            "mx-auto w-full font-korinna leading-normal font-bold text-white uppercase transition-opacity duration-150 text-shadow-lg word-spacing-1",
            variant === "tv" ? "max-w-none" : "max-w-screen-lg",
            // Leave room for the media below the text.
            hasMedia
              ? variant === "tv"
                ? "max-h-[25dvh]"
                : "max-h-[20dvh]"
              : variant === "tv"
                ? "max-h-[55dvh]"
                : "max-h-96",
          )}
          ref={ref}
          style={{ fontSize, opacity: fontSize ? 1 : 0 }}
        >
          {clue}
          {clue ? <br /> : null}
          <span
            className={clsx("text-cyan-300", {
              invisible: !showAnswer,
            })}
          >
            {answer}
          </span>
        </p>
        {images.map((block, i) => (
          <ClueImage key={`${i}-${block.src}`} block={block} />
        ))}
      </button>
      {/* Audio/video controls live outside the buzz button: tapping them must
          not buzz in, and interactive content can't be nested in a button. */}
      <PlayableMedia
        blocks={media}
        autoPlay={autoPlayMedia}
        replayNonce={mediaReplayCount}
      />
    </div>
  );
}

/** BuzzHint is the top-right hint on the clue prompt. Secret questions are
 * answered without buzzing, so they are labelled instead. */
function BuzzHint({ secret }: { secret: boolean }) {
  const { t, rich } = useTranslation();
  if (secret) {
    return (
      <span className="text-right text-sm text-slate-300">
        <span aria-hidden>🐱</span> {t("play.secretHint")}
      </span>
    );
  }
  // Nothing to click once someone buzzed in; phones show no keyboard hint.
  return (
    <span className="text-sm text-slate-300 buzzbar:hidden">
      {rich("play.buzzHint", { kbd })}
    </span>
  );
}

/** WagerCluePrompt handles all frontend behavior while the game state is
 * GameState.WagerClue.
 */
function WagerCluePrompt({ roomId, userId }: RoomProps) {
  const { clue, boardControl, buzzes, category, players } = useEngineContext();
  const { t } = useTranslation();
  const { ref, fontSize } = useFitText<HTMLDivElement>({ maxFontSize: 300 });
  const wagerTimer = useWagerTimer();

  const canWager = buzzes.get(userId) !== CANT_BUZZ_FLAG;
  const wagererName = boardControl
    ? (players.get(boardControl)?.name ?? t("play.winningBuzzer"))
    : t("play.winningBuzzer");
  const longForm = clue?.longForm ?? false;

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={canWager}
      />
      {longForm ? null : (
        <div className="p-4">
          <CategoryFor category={category} value={clue?.value ?? 0} />
        </div>
      )}
      <div
        className="flex w-screen grow items-center justify-center transition-opacity duration-150"
        ref={ref}
        style={{ fontSize, opacity: fontSize ? 1 : 0 }}
      >
        {longForm ? (
          <div className="mx-auto flex max-h-96 max-w-screen-lg flex-col p-4">
            <ShinyText text={t("play.finalClue")} />
            <p className="text-center font-korinna font-bold break-words text-white uppercase text-shadow-md">
              {category}
            </p>
          </div>
        ) : (
          <div className="relative p-4">
            <ShinyText text={t("play.doubleDown")} />
            {/* Hidden absolute element keeps shiny text from overflowing its grid */}
            <p className="invisible absolute top-0 left-0 p-4 text-center font-black text-white uppercase">
              {t("play.doubleDown")}
            </p>
          </div>
        )}
      </div>
      {canWager ? (
        <WagerForm roomId={roomId} userId={userId} timer={wagerTimer} />
      ) : longForm ? (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="font-bold text-white">{t("play.notEnoughToWager")}</p>
          <p className="text-sm text-slate-300">{t("play.waitingForWagers")}</p>
        </div>
      ) : (
        <p className="p-2 text-center font-bold text-white">
          {t("play.waitingForResponse", { name: wagererName })}
        </p>
      )}
      {wagerTimer.startedAt !== null ? (
        <WagerTimer timer={wagerTimer} />
      ) : (
        <Countdown startTime={undefined} />
      )}
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
    readTimeSec,
    buzzWindowSec,
    soloDispatch,
  } = useEngineContext();
  const buzzWindowMs = getBuzzWindowMs({ buzzWindowSec });
  const noBuzzMs = getNoBuzzMs({ buzzWindowSec });

  const clueMedia = useClueMedia();
  const { rich } = useTranslation();
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

  const clueDurationMs = getRoomReadMs(clue, readTimeSec);

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

  // If the player with board control does nothing for the room's buzz
  // window after the buzzer opens, close the buzzer and send a "no buzz"
  // (one millisecond past the window) to the server.
  useTimeout(
    () => {
      if (!buzzerOpenAt) return;
      submitBuzz(noBuzzMs);
    },
    buzzerOpenAt !== undefined && boardControl === userId ? noBuzzMs : null,
  );

  // Play the "time's up" sound after the buzz window if no one buzzed in
  // after the buzzer opened.
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  useTimeout(
    playTimesUpSfx,
    buzzerOpenAt === undefined || buzzDurationMs ? null : buzzWindowMs,
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
        buzzWindowMs={buzzWindowMs}
        shouldAnimate={buzzDurationMs === undefined}
        wonBuzz={
          buzzDurationMs !== undefined &&
          buzzDurationMs !== CANT_BUZZ_FLAG &&
          buzzDurationMs <= buzzWindowMs
        }
      />
      <div className="flex justify-between p-4">
        <CategoryFor category={category} value={clue.value} wager={clueValue} />
        <span className="text-sm text-slate-300">
          {rich("play.buzzHint", { kbd })}
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={boardControl === userId}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz
        media={clueMedia(clue)}
        autoPlayMedia
        showAnswer={false}
        answer={clue.answer}
      />
      <ConnectedChoiceList />
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
  const {
    activeClue,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    readTimeSec,
    buzzWindowSec,
    soloDispatch,
  } = useEngineContext();
  const buzzWindowMs = getBuzzWindowMs({ buzzWindowSec });
  const noBuzzMs = getNoBuzzMs({ buzzWindowSec });

  const clueMedia = useClueMedia();
  const { t, rich } = useTranslation();
  const { mute } = useSoundSettings();
  if (!clue) throw new Error("No clue found");

  // Compute clueDurationMs once at mount so the ReadClueTimer CSS animation
  // doesn't restart when server buzz events arrive mid-animation. The
  // component remounts between ReadClue phases, so this captures the right
  // value for re-reads (after a wrong answer) too.
  const [isReRead] = React.useState(
    () =>
      !clue.wagerable &&
      Array.from(buzzes.values()).some((b) => b === CANT_BUZZ_FLAG),
  );
  const [clueDurationMs] = React.useState(() =>
    getRoomReadMs(clue, readTimeSec, { reRead: isReRead }),
  );

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
          timeout = setTimeout(() => submitBuzz(noBuzzMs), remainingMs);
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
  }, [buzzes, buzzerOpenAt, myBuzzDurationMs, userId, submitBuzz, noBuzzMs]);

  // Open the buzzer after the clue is done being "read".
  const delayMs = myBuzzDurationMs === undefined ? clueDurationMs : null;
  useTimeout(() => setBuzzerOpenAt(Date.now()), delayMs);

  // If nothing happens for the room's buzz window after the buzzer opens,
  // close the buzzer and send a "no buzz" (one millisecond past the window)
  // to the server.
  useTimeout(
    () => {
      if (!buzzerOpenAt) return;
      setOptimisticBuzzes(
        produce((draft) => {
          const prev = draft.get(userId);
          if (prev) {
            return;
          }
          draft.set(userId, noBuzzMs);
        }),
      );
      submitBuzz(noBuzzMs);
    },
    buzzerOpenAt === undefined ? null : noBuzzMs,
  );

  // Play the "time's up" sound after the buzz window if no one buzzed in
  // after the buzzer opened.
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  const someoneBuzzed = Array.from(optimisticBuzzes.values()).some(
    (v) => v !== CANT_BUZZ_FLAG && v <= buzzWindowMs,
  );
  useTimeout(
    playTimesUpSfx,
    buzzerOpenAt === undefined || someoneBuzzed ? null : buzzWindowMs,
  );

  function handleClick(clickedAtMs: number) {
    if (lockout || myBuzzDurationMs !== undefined) {
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
        buzzWindowMs={buzzWindowMs}
        shouldAnimate={myBuzzDurationMs === undefined}
        wonBuzz={
          myBuzzDurationMs !== undefined &&
          myBuzzDurationMs !== CANT_BUZZ_FLAG &&
          myBuzzDurationMs <= buzzWindowMs
        }
      />
      <div className="flex justify-between gap-2 p-4">
        <CategoryFor category={category} value={clueValue} />
        <span className="text-sm text-slate-300 buzzbar:hidden">
          {rich("play.buzzHint", { kbd })}
        </span>
        <span className="hidden text-right text-sm text-slate-300 buzzbar:inline">
          {t("play.tapHint")}
        </span>
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={!lockout && myBuzzDurationMs === undefined}
        onBuzz={() => handleClick(Date.now())}
        focusOnBuzz
        media={clueMedia(clue)}
        autoPlayMedia={!isReRead}
        showAnswer={false}
        answer={clue.answer}
        touchBuzz={false}
      />
      <TimesUpNotice />
      {hasChoices(clue) ? (
        // Options stay in the same place when the buzz winner picks one.
        <ConnectedChoiceList />
      ) : (
        // Keeps the layout from jumping when the check form appears. On
        // phones the BUZZ button takes that place instead.
        <div className="invisible buzzbar:hidden">
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
      <BuzzButton
        state={getBuzzButtonState({
          lockout,
          buzzerOpen: buzzerOpenAt !== undefined,
          buzzes: optimisticBuzzes,
          userId,
          players,
          buzzWindowMs,
        })}
        clueDurationMs={clueDurationMs}
        onBuzz={() => handleClick(Date.now())}
        mute={mute}
      />
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
  const clueMedia = useClueMedia();
  const { t } = useTranslation();
  if (!clue) throw new Error("clue is undefined");

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const myBuzzDurationMs = buzzes.get(userId);
  const canAnswer = myBuzzDurationMs !== CANT_BUZZ_FLAG;
  const allPlayersCantAnswer =
    buzzes.size === players.size &&
    Array.from(buzzes.values()).every((b) => b === CANT_BUZZ_FLAG);

  // The room's Final answer time, from when the step started (server
  // clock): the same on every device.
  const finalTimer = useFinalAnswerTimer();

  // Play the long form sound when the component mounts, unless the clue has
  // its own audio/video to listen to.
  const clueHasPlayableMedia = hasPlayableMedia(clueMedia(clue));
  const [playLongFormSfx, { stop }] = useGameSound(LONG_FORM_SFX);
  React.useEffect(() => {
    if (clueHasPlayableMedia) return;
    playLongFormSfx();
    return () => stop();
  }, [playLongFormSfx, stop, clueHasPlayableMedia]);

  const clueValue = activeClue ? getClueValue(activeClue, userId) : 0;

  return (
    <>
      <div className="flex justify-between p-4">
        <CategoryFor category={category} value={clueValue} />
      </div>
      <ClueText
        clue={clue.clue}
        canBuzz={false}
        onBuzz={() => null}
        focusOnBuzz={false}
        media={clueMedia(clue)}
        autoPlayMedia
        showAnswer={false}
        answer={clue.answer}
      />
      {canAnswer ? (
        <AnswerForm roomId={roomId} userId={userId} timer={finalTimer} />
      ) : allPlayersCantAnswer ? (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="font-bold text-white">{t("play.noOneCanWagerRead")}</p>
          <NextClueForm roomId={roomId} userId={userId} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-2">
          <p className="text-sm text-slate-300">
            {t("play.waitingForAnswers")}
          </p>
        </div>
      )}
      <FinalAnswerTimer timer={finalTimer} />
      <Buzzes />
    </>
  );
}

/** AnswerTimerHint tells the answering player what happens when their time
 * runs out (or, without auto-marking, to mark their answer now). */
function AnswerTimerHint({
  expired,
  autoWrong,
}: {
  expired: boolean;
  autoWrong: boolean;
}) {
  const { t } = useTranslation();
  if (expired === autoWrong) return null;
  return (
    <p className="text-center text-sm text-slate-300">
      {expired
        ? t("play.answerTimer.markNow")
        : t("play.answerTimer.autoWrongHint")}
    </p>
  );
}

/** RevealAnswerToBuzzerPrompt handles all frontend behavior while the game state
 * is GameState.RevealAnswerToBuzzer.
 */
function RevealAnswerToBuzzerPrompt({ roomId, userId }: RoomProps) {
  const {
    activeClue,
    autoWrongOnTimeout,
    board,
    category,
    clue,
    getClueValue,
    host,
    players,
    winningBuzzer,
  } = useEngineContext();
  const { t } = useTranslation();
  const clueMedia = useClueMedia();
  // Host mode (feature 22): the player answers out loud and the host judges
  // (a multiple choice option is still picked here).
  const hostMode = host !== null;

  // The answer timer (room setting): everyone sees the countdown; when it
  // runs out, the answering player's own device marks the answer wrong (in
  // host mode the host's device does).
  const timer = useAnswerTimer();
  const [marked, setMarked] = React.useState(false);
  const timedOut = useAutoWrongOnTimeout({
    roomId,
    userId,
    timer,
    marked,
    enabled: !hostMode,
  });

  if (!clue) throw new Error("clue is undefined");
  if (!activeClue) throw new Error("activeClue is undefined");
  if (!winningBuzzer) throw new Error("winningBuzzer is undefined");

  const clueValue = clue.wagerable
    ? getClueValue(activeClue, winningBuzzer)
    : getClueValue(activeClue, userId);

  const canShowAnswer = winningBuzzer === userId;
  const [showAnswer, setShowAnswer] = React.useState(false);
  // Multiple choice: the winner picks an option instead of revealing the
  // answer and checking themselves.
  const isMultipleChoice = hasChoices(clue);
  // Secret question: the receiver answers it alone, with no buzzing first,
  // so they get time to read it (no 5-second countdown).
  const isSecret = isSecretClue(clue);

  // Without the answer timer: play the "time's up" sound after 5 seconds if
  // the contestant can reveal the answer but hasn't yet (a hint only).
  const hintCountdown = canShowAnswer && !isSecret && !timer.timed;
  const [playTimesUpSfx] = useGameSound(TIMES_UP_SFX);
  useTimeout(
    playTimesUpSfx,
    hintCountdown && !showAnswer ? ANSWER_HINT_MS : null,
  );
  const [countdownStartedAt] = React.useState(
    hintCountdown && !showAnswer ? Date.now() : undefined,
  );

  const winningPlayerName = winningBuzzer
    ? (players.get(winningBuzzer)?.name ?? t("play.winningBuzzer"))
    : t("play.winningBuzzer");

  return (
    <>
      <ReadClueTimer
        clueDurationMs={0}
        shouldAnimate={false}
        wonBuzz={canShowAnswer}
      />
      <div className="flex justify-between gap-2 p-4">
        <CategoryFor
          category={
            isSecret && board ? getSecretTopic(board, activeClue) : category
          }
          value={clueValue}
        />
        <BuzzHint secret={isSecret} />
      </div>
      {isSecret ? (
        <p
          className="px-4 text-center text-lg font-bold text-yellow-300"
          data-testid="secret-receiver"
        >
          {canShowAnswer
            ? t("play.yourSecretQuestion")
            : t("play.secretQuestionFor", { name: winningPlayerName })}
        </p>
      ) : null}
      <ClueText
        answer={clue.answer}
        canBuzz={false}
        clue={clue.clue}
        focusOnBuzz={false}
        media={revealMedia(clue, canShowAnswer && showAnswer, clueMedia)}
        autoPlayMedia={
          isSecret
            ? !(canShowAnswer && showAnswer) || hasAnswerMedia(clue)
            : hasAnswerMedia(clue) && canShowAnswer && showAnswer
        }
        onBuzz={() => null}
        showAnswer={false}
      />
      {timedOut ? (
        <>
          {isMultipleChoice ? <ConnectedChoiceList /> : null}
          <p
            className="p-2 text-center font-bold text-white"
            data-testid="answer-timed-out"
          >
            {t("play.answerTimer.countedWrong")}
          </p>
        </>
      ) : isMultipleChoice ? (
        canShowAnswer ? (
          <ConnectedChoicePicker
            roomId={roomId}
            userId={userId}
            onPick={() => setMarked(true)}
          />
        ) : (
          <>
            <ConnectedChoiceList />
            <p className="p-2 text-center font-bold text-white">
              {t("play.waitingForPick", { name: winningPlayerName })}
            </p>
          </>
        )
      ) : hostMode ? (
        <p
          className="p-2 text-center font-bold text-white"
          data-testid="host-judges"
        >
          {canShowAnswer
            ? t("host.player.youAnswer")
            : t("host.player.answering", { name: winningPlayerName })}
        </p>
      ) : canShowAnswer ? (
        <CheckForm
          roomId={roomId}
          userId={userId}
          showAnswer={canShowAnswer && showAnswer}
          onClickShowAnswer={
            canShowAnswer ? () => setShowAnswer(true) : () => null
          }
          onSubmit={() => setMarked(true)}
        />
      ) : (
        <p className="p-2 text-center font-bold text-white">
          {t("play.waitingForResponse", { name: winningPlayerName })}
        </p>
      )}
      {timer.timed ? (
        <ConnectedAnswerTimer timer={timer}>
          {canShowAnswer && timer.status && !hostMode ? (
            <AnswerTimerHint
              expired={timer.status.expired}
              autoWrong={autoWrongOnTimeout}
            />
          ) : null}
        </ConnectedAnswerTimer>
      ) : (
        <Countdown startTime={showAnswer ? undefined : countdownStartedAt} />
      )}
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
    host,
    players,
  } = useEngineContext();
  const { t, rich } = useTranslation();
  const clueMedia = useClueMedia();
  if (!clue) throw new Error("clue is undefined");
  if (!activeClue) throw new Error("activeClue is undefined");

  const clueValue = getClueValue(activeClue, userId);
  const buzzDurationMs = buzzes.get(userId);
  // Host mode (feature 22): the host judges every answer.
  const hostMode = host !== null;
  const canCheckAnswer =
    !hostMode &&
    buzzDurationMs !== undefined &&
    buzzDurationMs !== CANT_BUZZ_FLAG;

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
        <CategoryFor category={category} value={clueValue} />
        <span className="text-sm text-slate-300">
          {rich("play.buzzHint", { kbd })}
        </span>
      </div>
      <ClueText
        answer={clue.answer}
        canBuzz={false}
        clue={clue.clue}
        focusOnBuzz={false}
        media={revealMedia(clue, true, clueMedia)}
        autoPlayMedia={hasAnswerMedia(clue)}
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
      ) : hostMode ? (
        <p
          className="p-2 text-center font-bold text-white"
          data-testid="host-judges"
        >
          {t("host.player.judging")}
        </p>
      ) : (
        <p className="p-2 text-center text-sm text-slate-300">
          {t("play.waitingForChecks", {
            names: unansweredPlayers.map((p) => p.name).join(", "),
          })}
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
                <p className="text-sm text-slate-300">{t("play.noAnswer")}</p>
              )}
            </div>
          );
        })}
      </div>
      <Countdown startTime={undefined} />
      <Buzzes />
    </>
  );
}

/** RevealAnswerToAllPrompt handles all frontend behavior while the game state is
 * GameState.ReadAnswerToAll.
 */
function RevealAnswerToAllPrompt({ roomId, userId }: RoomProps) {
  const { activeClue, answeredBy, board, category, clue, getClueValue, host } =
    useEngineContext();
  const { t } = useTranslation();
  const clueMedia = useClueMedia();
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
        <CategoryFor
          category={
            isSecretClue(clue) && board && activeClue
              ? getSecretTopic(board, activeClue)
              : category
          }
          value={clueValue}
        />
        <BuzzHint secret={isSecretClue(clue)} />
      </div>

      <ClueText
        clue={clue.clue}
        canBuzz={false}
        onBuzz={() => null}
        focusOnBuzz={false}
        media={revealMedia(clue, true, clueMedia)}
        autoPlayMedia={hasAnswerMedia(clue)}
        showAnswer
        // Host mode: the server's reveal may arrive a moment later.
        answer={
          clue.answer || (host !== null ? t("host.player.revealing") : "")
        }
      />
      <TimesUpNotice />
      <ConnectedChoiceList revealCorrect />
      <NextClueForm roomId={roomId} userId={userId} />
      <Countdown startTime={undefined} />
      <Buzzes />
    </>
  );
}

/** PROMPT_STATES are the game states in which a question (or wager, or
 * cat-in-the-bag hand-over) covers the board. */
export const PROMPT_STATES: ReadonlySet<GameState> = new Set([
  GameState.WagerClue,
  GameState.PassClue,
  GameState.ReadClue,
  GameState.ReadWagerableClue,
  GameState.ReadLongFormClue,
  GameState.RevealAnswerToBuzzer,
  GameState.RevealAnswerLongForm,
  GameState.RevealAnswerToAll,
]);

/** PromptFrame is the full-screen frame the prompt slides into. */
export function PromptFrame({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <Fade show={show}>
      <div
        className={`relative flex w-screen flex-col justify-between overflow-x-hidden overflow-y-scroll bg-blue-bright`}
        style={{
          height: "100dvh",
        }}
      >
        {children}
      </div>
    </Fade>
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
      case GameState.PassClue:
        return <ConnectedPassCluePrompt {...props} />;
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
    <PromptFrame show={isOpen}>
      <Lockout active={lockout} />
      {promptContent}
    </PromptFrame>
  );
}
