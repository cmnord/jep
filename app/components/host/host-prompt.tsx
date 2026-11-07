import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import {
  ConnectedAnswerTimer,
  TimesUpNotice,
  useAnswerTimer,
  useAutoWrongOnTimeout,
} from "~/components/prompt/answer-timer";
import { Buzzes } from "~/components/prompt/buzz";
import { ConnectedChoiceList } from "~/components/prompt/choices";
import { ClueImage, PlayableMedia } from "~/components/prompt/clue-media";
import { ConnectedNextClueForm } from "~/components/prompt/next-clue-form";
import { SecretClueBanner } from "~/components/prompt/pass-clue";
import {
  CategoryFor,
  ClueText,
  PROMPT_STATES,
  PromptFrame,
  useClueMedia,
} from "~/components/prompt/prompt";
import ShinyText from "~/components/prompt/shiny-text";
import {
  FinalAnswerTimer,
  useFinalAnswerTimer,
  useWagerTimer,
  WagerTimer,
} from "~/components/prompt/step-timers";
import {
  useViewerStatus,
  ViewerStatusLine,
} from "~/components/watch/viewer-prompt";
import { CANT_BUZZ_FLAG, GameState, useEngineContext } from "~/engine";
import { getSecretTopic, isSecretClue } from "~/engine/state";
import { useTranslation } from "~/i18n";
import type { Clue } from "~/models/convert.server";
import { hasChoices } from "~/utils/choices";
import { hasPlayableMedia } from "~/utils/media";

const JUDGE_BUTTON =
  "inline-flex min-h-12 min-w-28 touch-manipulation items-center justify-center rounded-xl px-5 py-3 text-lg font-bold text-white shadow-md transition-colors focus:ring-2 focus:ring-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/** HostAnswer is the correct answer, always in view of the host: the text
 * and the answer's own pictures, sound or video. */
function HostAnswer({ clue }: { clue: Clue }) {
  const { t } = useTranslation();
  const media = clue.answerMedia ?? [];
  return (
    <section
      className="mx-auto flex w-[calc(100%-2rem)] max-w-screen-md shrink-0 flex-col items-center gap-2 rounded-xl border-2 border-cyan-300/60 bg-blue-1000/60 px-4 py-3 text-center"
      data-testid="host-answer"
      aria-label={t("host.answer")}
    >
      <p className="text-xs font-semibold tracking-wide text-cyan-200 uppercase">
        {t("host.answer")}
      </p>
      <p className="font-korinna text-2xl font-bold break-words text-cyan-300 uppercase text-shadow-md sm:text-3xl">
        {clue.answer}
      </p>
      {media
        .filter((b) => b.type === "image")
        .map((block, i) => (
          <div key={`${i}-${block.src}`} className="max-h-40 overflow-hidden">
            <ClueImage block={block} />
          </div>
        ))}
      <PlayableMedia blocks={media} autoPlay={false} />
    </section>
  );
}

/** ReplayMediaButton restarts the question's audio/video on every device
 * (feature 23). Only the host sees it. */
function ReplayMediaButton({
  roomId,
  userId,
}: {
  roomId: number;
  userId: string;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  return (
    <div className="flex flex-col items-center gap-1 px-4 pb-2">
      <button
        type="button"
        data-testid="host-replay-media"
        className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold text-white shadow-md transition-colors hover:bg-white/25 focus:ring-2 focus:ring-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={fetcher.state !== "idle"}
        title={t("host.replayMediaHelp")}
        onClick={() =>
          fetcher.submit(
            { intent: "replay", userId },
            { method: "post", action: `/room/${roomId}/host` },
          )
        }
        // Enter is the buzz key elsewhere; don't replay by accident.
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      >
        <span aria-hidden>🔁</span> {t("host.replayMedia")}
      </button>
    </div>
  );
}

/** useJudge sends the host's verdict on `userId`'s answer (the check route
 * with host=true). */
function useJudge(roomId: number) {
  const { activeClue } = useEngineContext();
  const fetcher = useFetcher();
  const judge = (userId: string, correct: boolean) => {
    if (!activeClue) return;
    const [i, j] = activeClue;
    fetcher.submit(
      {
        i: String(i),
        j: String(j),
        userId,
        result: correct ? "correct" : "incorrect",
        host: "true",
      },
      { method: "post", action: `/room/${roomId}/check` },
    );
  };
  return { judge, busy: fetcher.state !== "idle" };
}

function JudgeButtons({
  name,
  onJudge,
  disabled,
  size = "lg",
}: {
  name: string;
  onJudge: (correct: boolean) => void;
  disabled: boolean;
  size?: "lg" | "sm";
}) {
  const { t } = useTranslation();
  const sm = size === "sm";
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button
        type="button"
        className={clsx(
          JUDGE_BUTTON,
          "bg-red-600 hover:bg-red-700",
          sm && "min-h-10 min-w-20 px-3 py-2 text-base",
        )}
        disabled={disabled}
        onClick={() => onJudge(false)}
        aria-label={t("host.wrongFor", { name })}
      >
        ✗ {t("host.wrong")}
      </button>
      <button
        type="button"
        className={clsx(
          JUDGE_BUTTON,
          "bg-green-600 hover:bg-green-700",
          sm && "min-h-10 min-w-20 px-3 py-2 text-base",
        )}
        disabled={disabled}
        onClick={() => onJudge(true)}
        aria-label={t("host.rightFor", { name })}
      >
        ✓ {t("host.right")}
      </button>
    </div>
  );
}

/** HostAnswering: the buzz winner (or the cat's receiver) answers out loud;
 * the host taps Right / Wrong. A multiple choice pick is judged by the
 * server. The answer timer's timeout is sent from here (the host's device is
 * the authority in host mode). */
function HostAnswering({ roomId, userId }: RoomProps) {
  const { clue, players, winningBuzzer } = useEngineContext();
  const { t } = useTranslation();
  const { judge, busy } = useJudge(roomId);
  const timer = useAnswerTimer();
  const [marked, setMarked] = React.useState(false);
  const timedOut = useAutoWrongOnTimeout({
    roomId,
    userId,
    timer,
    marked,
    asHost: true,
  });
  if (!clue || !winningBuzzer) return null;
  const name = players.get(winningBuzzer)?.name ?? t("play.winningBuzzer");
  const multipleChoice = hasChoices(clue);
  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <p
        className="text-center text-2xl font-bold text-white"
        data-testid="host-answering"
      >
        {isSecretClue(clue)
          ? t("host.secretAnswering", { name })
          : t("host.isAnswering", { name })}
      </p>
      {timedOut ? (
        <p className="font-bold text-red-300">{t("host.timeUp")}</p>
      ) : multipleChoice ? (
        <p className="text-sm text-slate-300">{t("host.pickAuto")}</p>
      ) : (
        <JudgeButtons
          name={name}
          disabled={busy || marked}
          onJudge={(correct) => {
            setMarked(true);
            judge(winningBuzzer, correct);
          }}
        />
      )}
      <ConnectedAnswerTimer timer={timer} />
    </div>
  );
}

/** HostFinalAnswers: the Final's typed answers, live while players write
 * them; once all are in, Right / Wrong per player. */
function HostFinalAnswers({ roomId }: { roomId: number }) {
  const { activeClue, answers, answeredBy, buzzes, players, type } =
    useEngineContext();
  const { t } = useTranslation();
  const { judge, busy } = useJudge(roomId);
  if (!activeClue) return null;
  const [i, j] = activeClue;
  const judging = type === GameState.RevealAnswerLongForm;
  const answering = Array.from(players.values()).filter(
    (p) => buzzes.get(p.userId) !== CANT_BUZZ_FLAG,
  );
  return (
    <div className="flex w-full flex-col items-center gap-2 px-4 pb-2">
      <p className="text-sm text-slate-300">
        {judging ? t("host.judgeFinal") : t("host.finalWriting")}
      </p>
      <ul className="flex w-full max-w-screen-md flex-col gap-2">
        {answering.map((p) => {
          const answer = answers.get(p.userId);
          const verdict = answeredBy(i, j, p.userId);
          return (
            <li
              key={p.userId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-1000/50 px-3 py-2"
              data-testid="host-final-answer"
            >
              <div className="min-w-0">
                <p className="font-handwriting text-lg font-bold text-white">
                  {p.name}
                </p>
                <p
                  className={clsx(
                    "break-words",
                    answer ? "text-white" : "text-sm text-slate-300",
                  )}
                >
                  {answer ?? t("host.noAnswerYet")}
                </p>
              </div>
              {verdict !== undefined ? (
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-sm font-bold",
                    verdict ? "bg-green-600" : "bg-red-600",
                    "text-white",
                  )}
                >
                  {verdict ? t("host.judgedRight") : t("host.judgedWrong")}
                </span>
              ) : judging && answers.has(p.userId) ? (
                <JudgeButtons
                  size="sm"
                  name={p.name}
                  disabled={busy}
                  onJudge={(correct) => judge(p.userId, correct)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** HostPromptContent is the host's view of an open question: the question
 * and its media, the correct answer all the time, what happens, and the
 * host's controls (judge, move on). */
function HostPromptContent({ roomId, userId }: RoomProps) {
  const {
    type,
    activeClue,
    board,
    boardControl,
    buzzes,
    category,
    clue,
    getClueValue,
    players,
    winningBuzzer,
  } = useEngineContext();
  const { t } = useTranslation();
  const clueMedia = useClueMedia();
  const status = useViewerStatus();
  const wagerTimer = useWagerTimer();
  const finalTimer = useFinalAnswerTimer();

  if (!PROMPT_STATES.has(type) || !clue || !activeClue || !board) {
    return null;
  }
  const secret = isSecretClue(clue);
  const topic = secret ? getSecretTopic(board, activeClue) : category;
  const value = getClueValue(activeClue, winningBuzzer ?? boardControl ?? "");
  const statusLine = (
    <ViewerStatusLine
      status={status}
      className="p-2 text-center text-xl font-bold text-white"
    />
  );
  const header = (
    <div className="flex justify-between gap-2 p-4">
      {clue.longForm ? (
        <p className="font-bold text-white">{topic}</p>
      ) : (
        <CategoryFor
          category={topic}
          value={clue.wagerable && value === 0 ? clue.value : value}
        />
      )}
      <span className="text-sm font-semibold whitespace-nowrap text-cyan-200">
        🎤 {t("host.badgeYou")}
      </span>
    </div>
  );

  if (type === GameState.WagerClue || type === GameState.PassClue) {
    return (
      <>
        {header}
        <div className="flex grow flex-col items-center justify-center gap-2">
          {type === GameState.PassClue ? (
            <SecretClueBanner topic={topic ?? ""} value={value} />
          ) : (
            <div className="relative p-4 text-5xl">
              <ShinyText
                text={
                  clue.longForm ? t("play.finalClue") : t("play.doubleDown")
                }
              />
            </div>
          )}
          {statusLine}
        </div>
        <HostAnswer clue={clue} />
        <WagerTimer timer={wagerTimer} />
      </>
    );
  }

  const allCantAnswer =
    buzzes.size === players.size &&
    Array.from(buzzes.values()).every((b) => b === CANT_BUZZ_FLAG);

  return (
    <>
      {header}
      <ClueText
        key={type}
        clue={clue.clue}
        answer=""
        canBuzz={false}
        focusOnBuzz={false}
        onBuzz={() => null}
        showAnswer={false}
        media={clueMedia(clue)}
        autoPlayMedia={
          type === GameState.ReadClue ||
          type === GameState.ReadWagerableClue ||
          type === GameState.ReadLongFormClue
        }
      />
      {hasPlayableMedia(clueMedia(clue)) ? (
        <ReplayMediaButton roomId={roomId} userId={userId} />
      ) : null}
      <HostAnswer clue={clue} />
      {/* The host knows the right option all along. */}
      <ConnectedChoiceList revealCorrect />
      {type === GameState.RevealAnswerToBuzzer ? (
        <HostAnswering roomId={roomId} userId={userId} />
      ) : type === GameState.ReadLongFormClue ||
        type === GameState.RevealAnswerLongForm ? (
        <>
          {statusLine}
          {allCantAnswer ? (
            <ConnectedNextClueForm roomId={roomId} userId={userId} />
          ) : (
            <HostFinalAnswers roomId={roomId} />
          )}
          <FinalAnswerTimer timer={finalTimer} />
        </>
      ) : type === GameState.RevealAnswerToAll ? (
        <>
          <TimesUpNotice />
          <ConnectedNextClueForm roomId={roomId} userId={userId} />
        </>
      ) : (
        <>
          {statusLine}
          <TimesUpNotice />
        </>
      )}
      <Buzzes />
    </>
  );
}

/** HostPrompt is the host's full-screen question view (feature 22). */
export function HostPrompt(props: RoomProps) {
  const { type } = useEngineContext();
  return (
    <PromptFrame show={PROMPT_STATES.has(type)}>
      <div className="flex grow flex-col" data-testid="host-prompt">
        <HostPromptContent {...props} />
      </div>
    </PromptFrame>
  );
}
