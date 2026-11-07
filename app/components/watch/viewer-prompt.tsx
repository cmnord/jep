import clsx from "clsx";
import * as React from "react";

import {
  ConnectedAnswerTimer,
  TimesUpNotice,
  useAnswerTimer,
} from "~/components/prompt/answer-timer";
import { Buzzes } from "~/components/prompt/buzz";
import { ConnectedChoiceList } from "~/components/prompt/choices";
import { SecretClueBanner } from "~/components/prompt/pass-clue";
import {
  CategoryFor,
  ClueText,
  hasAnswerMedia,
  PROMPT_STATES,
  PromptFrame,
  revealMedia,
  useClueMedia,
} from "~/components/prompt/prompt";
import ShinyText from "~/components/prompt/shiny-text";
import {
  FinalAnswerTimer,
  useFinalAnswerTimer,
  useWagerTimer,
  WagerTimer,
} from "~/components/prompt/step-timers";
import { CANT_BUZZ_FLAG, GameState, useEngineContext } from "~/engine";
import { getSecretTopic, isSecretClue } from "~/engine/state";
import { useTranslation } from "~/i18n";
import { getRoomReadMs } from "~/utils/media";

import { getViewerStatus, type ViewerStatus } from "./status";

export type ViewerVariant = "screen" | "tv";

/** useBuzzersOpen is true once a question in ReadClue has been "read" long
 * enough for the buzzers to open. Players' devices time this locally, so the
 * viewer does the same (it is only used for the status line). */
function useBuzzersOpen() {
  const { type, activeClue, clue, buzzes, readTimeSec } = useEngineContext();
  const reading = type === GameState.ReadClue && clue !== undefined;
  const isReRead =
    reading &&
    !clue.wagerable &&
    Array.from(buzzes.values()).some((b) => b === CANT_BUZZ_FLAG);
  const key = reading ? `${activeClue?.join(",")}:${isReRead}` : null;
  // The same reading time as the players' devices (room setting).
  const delayMs = !clue
    ? 0
    : getRoomReadMs(clue, readTimeSec, { reRead: isReRead });

  const [openKey, setOpenKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (key === null) return;
    const timeout = setTimeout(() => setOpenKey(key), delayMs);
    return () => clearTimeout(timeout);
  }, [key, delayMs]);
  return key !== null && openKey === key;
}

/** useViewerStatus is what is happening in the game, for viewers. */
export function useViewerStatus(): ViewerStatus {
  const engine = useEngineContext();
  const { t } = useTranslation();
  const buzzersOpen = useBuzzersOpen();
  return getViewerStatus(engine, {
    buzzersOpen,
    unknownName: t("room.unknownPlayer"),
  });
}

/** viewerStatusText translates a status into a sentence. */
export function useViewerStatusText(status: ViewerStatus): string {
  const { t } = useTranslation();
  // Host mode (feature 22): the host judges the Final's answers.
  const { host } = useEngineContext();
  switch (status.kind) {
    case "paused":
      return t("watch.status.paused");
    case "waitingForPlayers":
      return t("watch.status.waitingForPlayers");
    case "roundStarting":
      return status.name
        ? t("watch.status.roundStartingWith", {
            round: status.round,
            name: status.name,
          })
        : t("watch.status.roundStarting", { round: status.round });
    case "choosing":
      return t("watch.status.choosing", { name: status.name });
    case "final":
      return t("watch.status.final");
    case "wagering":
      return t("watch.status.wagering", { name: status.name });
    case "finalWagers":
      return t("watch.status.finalWagers", {
        done: status.done,
        total: status.total,
      });
    case "passing":
      return t("watch.status.passing", { name: status.name });
    case "reading":
      return t("watch.status.reading");
    case "buzzersOpen":
      return t("watch.status.buzzersOpen");
    case "answering":
      return t("watch.status.answering", { name: status.name });
    case "secretAnswering":
      return t("watch.status.secretAnswering", { name: status.name });
    case "picking":
      return t("watch.status.picking", { name: status.name });
    case "writing":
      return t("watch.status.writing");
    case "checking":
      return host ? t("host.player.judging") : t("watch.status.checking");
    case "gotIt":
      return t("watch.status.gotIt", { name: status.name });
    case "noOneAnswered":
      return t("watch.status.noOneAnswered");
    case "answer":
      return t("watch.status.answer");
    case "gameOver":
      return t("watch.status.gameOver");
  }
}

/** ViewerStatusLine shows what is happening now in one sentence. */
export function ViewerStatusLine({
  status,
  className,
}: {
  status: ViewerStatus;
  className?: string;
}) {
  const text = useViewerStatusText(status);
  return (
    <p
      className={className}
      data-testid="viewer-status"
      data-status={status.kind}
      aria-live="polite"
    >
      {text}
    </p>
  );
}

/** LongFormAnswers lists what each player wrote for a final question. */
function LongFormAnswers({ variant }: { variant: ViewerVariant }) {
  const { answers, players } = useEngineContext();
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-wrap justify-center gap-4 px-4">
      {Array.from(players.values()).map((p) => {
        const answer = answers.get(p.userId);
        return (
          <div
            key={p.userId}
            className="flex flex-col items-center justify-between"
          >
            <p
              className={clsx(
                "text-center font-handwriting font-bold text-white",
                variant === "tv" ? "text-2xl lg:text-4xl" : "text-xl",
              )}
            >
              {p.name}
            </p>
            {answer ? (
              <p
                className={clsx(
                  "text-white",
                  variant === "tv" && "text-xl lg:text-3xl",
                )}
              >
                {answer}
              </p>
            ) : (
              <p className="text-sm text-slate-300">{t("play.noAnswer")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** ViewerPromptContent is the read-only view of an open question, for people
 * who watch without playing (spectators, the TV screen): the question and
 * its media, the answer once it is revealed, multiple choice options, buzzes
 * and what is happening — no buzzer, forms or timers that send anything.
 * Renders nothing when no question is open. */
export function ViewerPromptContent({
  variant,
  status,
}: {
  variant: ViewerVariant;
  status: ViewerStatus;
}) {
  const {
    type,
    activeClue,
    board,
    boardControl,
    buzzes,
    category,
    clue,
    getClueValue,
    winningBuzzer,
  } = useEngineContext();
  const { t } = useTranslation();
  const clueMedia = useClueMedia();
  const timer = useAnswerTimer();
  const wagerTimer = useWagerTimer();
  const finalTimer = useFinalAnswerTimer();

  if (!PROMPT_STATES.has(type) || !clue || !activeClue || !board) {
    return null;
  }

  const tv = variant === "tv";
  const secret = isSecretClue(clue);
  const topic = secret ? getSecretTopic(board, activeClue) : category;
  // Wagers are per player: show the one of the player answering.
  const value = getClueValue(activeClue, winningBuzzer ?? boardControl ?? "");

  const statusLine = (
    <ViewerStatusLine
      status={status}
      className={clsx(
        "p-2 text-center font-bold text-white",
        tv ? "text-3xl lg:text-5xl" : "text-xl",
      )}
    />
  );
  const header = (
    <div
      className={clsx(
        "flex justify-between gap-2 p-4",
        tv && "text-2xl lg:text-4xl",
      )}
    >
      {clue.longForm ? (
        <p className="font-bold text-white">{topic}</p>
      ) : (
        <CategoryFor
          category={topic}
          value={clue.wagerable && value === 0 ? clue.value : value}
        />
      )}
    </div>
  );

  if (type === GameState.WagerClue) {
    return (
      <>
        {header}
        <div
          className={clsx(
            "flex grow items-center justify-center",
            tv ? "text-7xl lg:text-9xl" : "text-5xl",
          )}
        >
          <div className="relative p-4">
            <ShinyText
              text={clue.longForm ? t("play.finalClue") : t("play.doubleDown")}
            />
          </div>
        </div>
        {statusLine}
        <WagerTimer timer={wagerTimer} variant={variant} />
      </>
    );
  }

  if (type === GameState.PassClue) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-2">
        <SecretClueBanner topic={topic ?? ""} value={value} />
        {statusLine}
      </div>
    );
  }

  const showAnswer =
    type === GameState.RevealAnswerLongForm ||
    type === GameState.RevealAnswerToAll;
  const isReRead = Array.from(buzzes.values()).some(
    (b) => b === CANT_BUZZ_FLAG,
  );
  // Start audio/video like the players' screens do: while the question is
  // read (not again after a wrong answer), when a secret question reaches
  // its receiver (it has no reading phase), and answer media on reveal.
  const autoPlay =
    type === GameState.ReadClue
      ? !isReRead || Boolean(clue.wagerable)
      : type === GameState.ReadWagerableClue ||
          type === GameState.ReadLongFormClue
        ? true
        : type === GameState.RevealAnswerToBuzzer
          ? secret
          : showAnswer && hasAnswerMedia(clue);

  return (
    <>
      {header}
      <ClueText
        // A new player per phase, so media starts (or not) per phase.
        key={type}
        variant={variant}
        clue={clue.clue}
        answer={clue.answer}
        canBuzz={false}
        focusOnBuzz={false}
        onBuzz={() => null}
        showAnswer={showAnswer}
        media={revealMedia(clue, showAnswer, clueMedia)}
        autoPlayMedia={autoPlay}
      />
      <ConnectedChoiceList
        revealCorrect={type === GameState.RevealAnswerToAll}
      />
      {clue.longForm && showAnswer ? (
        <LongFormAnswers variant={variant} />
      ) : null}
      {statusLine}
      {type === GameState.ReadClue || type === GameState.RevealAnswerToAll ? (
        <TimesUpNotice variant={variant} />
      ) : null}
      <ConnectedAnswerTimer timer={timer} variant={variant} />
      <FinalAnswerTimer timer={finalTimer} variant={variant} />
      <Buzzes />
    </>
  );
}

/** SpectatorPrompt is the full-screen question view for a spectator in a
 * room: the same frame as the players' prompt, read-only. */
export function SpectatorPrompt() {
  const { type } = useEngineContext();
  const status = useViewerStatus();
  return (
    <PromptFrame show={PROMPT_STATES.has(type)}>
      <ViewerPromptContent variant="screen" status={status} />
    </PromptFrame>
  );
}
