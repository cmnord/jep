import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import type { RoomProps } from "~/components/game";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";
import { choiceLabel, getCorrectChoiceIndex } from "~/utils/choices";
import useSoloAction from "~/utils/use-solo-action";
import useTimeout from "~/utils/use-timeout";

/** Briefly ignore taps when the options become pickable, so the tap/keypress
 * that won the buzz can't also pick an option. */
const PICK_DEBOUNCE_MS = 500;

type ChoiceStatus = "neutral" | "correct" | "wrong";

/** ChoiceList shows the options of a multiple choice question.
 *
 * - Read-only (no `onPick`) while the question is read or someone else is
 *   answering; picks made so far are marked wrong (red) with who made them.
 * - With `onPick`, each option is a big tap target.
 * - With `revealCorrect`, the correct option is marked green.
 */
export function ChoiceList({
  choices,
  correctIndex,
  picks = new Map(),
  players = new Map(),
  revealCorrect = false,
  onPick,
  disabled = false,
}: {
  choices: string[];
  correctIndex: number;
  /** userId -> picked option index. */
  picks?: Map<string, number>;
  players?: Map<string, Player>;
  revealCorrect?: boolean;
  onPick?: (choice: number) => void;
  disabled?: boolean;
}) {
  // Read-only lists are compact (two columns even on phones) so the question
  // and its media keep their room; pickable options are full-width rows.
  const { t } = useTranslation();
  const compact = !onPick;
  const pickersByChoice = new Map<number, string[]>();
  for (const [userId, choice] of picks) {
    const name = players.get(userId)?.name ?? t("play.choices.someone");
    pickersByChoice.set(choice, [...(pickersByChoice.get(choice) ?? []), name]);
  }

  return (
    <ol
      className={clsx(
        "mx-auto grid w-full max-w-screen-lg shrink-0 gap-2 px-4 pb-2 sm:grid-cols-2",
        compact ? "grid-cols-2" : "grid-cols-1",
      )}
      aria-label={t("play.choices.options")}
      data-testid="choices"
    >
      {choices.map((choice, index) => {
        const pickers = pickersByChoice.get(index) ?? [];
        const isCorrect = index === correctIndex;
        // A correct pick ends the question, so it is always revealed.
        const status: ChoiceStatus =
          isCorrect && (revealCorrect || pickers.length > 0)
            ? "correct"
            : pickers.length > 0
              ? "wrong"
              : "neutral";
        const content = (
          <>
            <span
              className={clsx(
                "flex shrink-0 items-center justify-center rounded-full font-bold",
                compact
                  ? "h-6 w-6 text-sm sm:h-8 sm:w-8 sm:text-base"
                  : "h-8 w-8",
                status === "neutral"
                  ? "bg-yellow-300 text-blue-900"
                  : "bg-white text-slate-900",
              )}
              aria-hidden
            >
              {choiceLabel(index)}
            </span>
            <span
              className={clsx(
                "min-w-0 grow text-left font-korinna leading-tight font-bold break-words sm:text-xl",
                compact ? "text-base" : "text-lg",
              )}
            >
              {choice}
            </span>
            {pickers.length > 0 ? (
              <span
                className={clsx(
                  "max-w-[40%] truncate text-right font-normal",
                  compact ? "text-xs sm:text-sm" : "text-sm",
                )}
              >
                {pickers.join(", ")}
              </span>
            ) : null}
          </>
        );
        const className = clsx(
          "flex h-full w-full items-center rounded-lg border-2 text-white shadow-md transition-colors",
          compact
            ? "min-h-10 gap-2 px-2 py-1 sm:min-h-12 sm:gap-3 sm:px-3 sm:py-2"
            : "min-h-12 gap-3 px-3 py-2",
          {
            "border-blue-300/40 bg-blue-900/50": status === "neutral",
            "border-green-200 bg-green-600": status === "correct",
            "border-red-200 bg-red-600": status === "wrong",
          },
          onPick && status === "neutral"
            ? "cursor-pointer hover:border-yellow-300 hover:bg-blue-800 focus:ring-2 focus:ring-yellow-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            : null,
        );
        return (
          <li key={index} data-choice={choiceLabel(index)} data-status={status}>
            {onPick ? (
              <button
                type="button"
                className={className}
                disabled={disabled || status !== "neutral"}
                onClick={() => onPick(index)}
                aria-label={`${choiceLabel(index)}: ${choice}`}
              >
                {content}
              </button>
            ) : (
              <div className={className}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** ConnectedChoiceList shows the active question's options and picks. */
/** useCorrectChoiceIndex is the right option of the active question. In
 * host mode (feature 22) players' pages don't have the answer until it is
 * revealed, but a pick judged right by the server is the right option. */
export function useCorrectChoiceIndex() {
  const { activeClue, answeredBy, clue, choicePicks } = useEngineContext();
  if (!clue) return -1;
  const fromAnswer = getCorrectChoiceIndex(clue);
  if (fromAnswer !== -1 || !activeClue) return fromAnswer;
  for (const [userId, choice] of choicePicks) {
    if (answeredBy(activeClue[0], activeClue[1], userId) === true) {
      return choice;
    }
  }
  return -1;
}

export function ConnectedChoiceList({
  revealCorrect = false,
}: {
  revealCorrect?: boolean;
}) {
  const { clue, choicePicks, players } = useEngineContext();
  const correctIndex = useCorrectChoiceIndex();
  if (!clue?.choices) return null;
  return (
    <ChoiceList
      choices={clue.choices}
      correctIndex={correctIndex}
      picks={choicePicks}
      players={players}
      revealCorrect={revealCorrect}
    />
  );
}

/** ConnectedChoicePicker is shown to the winning buzzer of a multiple choice
 * question instead of "Reveal answer" + self-check: tapping an option submits
 * it, and the server checks it against the answer. Keys 1-6 pick too. */
export function ConnectedChoicePicker({
  roomId,
  userId,
  onPick,
}: RoomProps & {
  /** Called when the player picks an option. */
  onPick?: () => void;
}) {
  const { activeClue, clue, choicePicks, players, soloDispatch } =
    useEngineContext();
  const correctIndex = useCorrectChoiceIndex();
  const { t } = useTranslation();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const submit = fetcher.submit;

  const [ready, setReady] = React.useState(false);
  useTimeout(() => setReady(true), ready ? null : PICK_DEBOUNCE_MS);
  const [picked, setPicked] = React.useState<number | undefined>();

  const pick = React.useCallback(
    (choice: number) => {
      if (!ready || picked !== undefined || !activeClue) return;
      setPicked(choice);
      onPick?.();
      const [i, j] = activeClue;
      submit(
        {
          i: i.toString(),
          j: j.toString(),
          userId,
          choice: choice.toString(),
        },
        { method: "post", action: `/room/${roomId}/check` },
      );
    },
    [ready, picked, activeClue, submit, userId, roomId, onPick],
  );

  const numChoices = clue?.choices?.length ?? 0;
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= numChoices) {
        pick(n - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numChoices, pick]);

  if (!clue?.choices) return null;

  return (
    <>
      <p className="px-4 pb-2 text-center font-bold text-white">
        {picked === undefined
          ? t("play.choices.pickYourAnswer")
          : t("play.choices.youPicked", { label: choiceLabel(picked) })}
      </p>
      <ChoiceList
        choices={clue.choices}
        correctIndex={correctIndex}
        picks={choicePicks}
        players={players}
        onPick={pick}
        disabled={!ready || picked !== undefined}
      />
    </>
  );
}
