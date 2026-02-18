import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import type { Action, Player } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatDollarsWithSign } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";
import useTimeout from "~/utils/use-timeout";

const REVEAL_ANSWER_DEBOUNCE_MS = 500;

function CheckForm({
  answer,
  longForm,
  loading,
  myAnswer,
  playerName,
}: {
  answer: string;
  longForm: boolean;
  loading: boolean;
  myAnswer?: string;
  playerName?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {longForm ? null : (
        <>
          <p className="text-center font-korinna text-2xl font-bold text-slate-300 uppercase shadow-sm">
            {answer}
          </p>
          {!playerName && (
            <p className="text-center text-sm text-slate-300">
              (don't spoil the answer for others!)
            </p>
          )}
        </>
      )}
      {myAnswer && !playerName && (
        <p className="text-center text-sm text-slate-300">
          Your answer:{" "}
          <span className="font-handwriting text-2xl font-bold text-white">
            {myAnswer}
          </span>
        </p>
      )}
      <p className="font-bold text-white">
        {playerName ? `Was ${playerName} right?` : "Were you right?"}
      </p>
      <div className="flex gap-2">
        <Button
          htmlType="submit"
          name="result"
          value="incorrect"
          loading={loading}
        >
          incorrect
        </Button>
        <Button
          htmlType="submit"
          name="result"
          value="correct"
          type="primary"
          autoFocus
          loading={loading}
        >
          correct!
        </Button>
      </div>
    </div>
  );
}

/** ConnectedCheckForm is shown to the winning buzzer at the bottom of the
 * prompt. They reveal the answer, then check whether it's correct or
 * incorrect.
 */
export function ConnectedCheckForm({
  roomId,
  userId,
  longForm = false,
  showAnswer,
  onClickShowAnswer,
  playerName,
}: {
  longForm?: boolean;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
  playerName?: string;
} & RoomProps) {
  const {
    activeClue,
    clue,
    answeredBy,
    answers,
    getClueValue,
    soloDispatch,
    players,
  } = useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  // Disable the "show answer" button briefly on render to prevent
  // double-clicks.
  const [disabled, setDisabled] = React.useState(true);
  useTimeout(
    () => setDisabled(false),
    showAnswer ? null : REVEAL_ANSWER_DEBOUNCE_MS,
  );

  // Focus the "Reveal answer" button when the debounce expires.
  // autoFocus={!disabled} doesn't work because disabled starts true at mount,
  // and React doesn't re-apply autoFocus on subsequent renders.
  const revealButtonRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!disabled) {
      revealButtonRef.current?.focus();
    }
  }, [disabled]);

  if (!activeClue || !clue) {
    throw new Error("No active clue");
  }

  if (!showAnswer) {
    return (
      <div className="flex flex-col items-center gap-2 p-2">
        <p className="text-sm text-slate-300">
          Answer in the form of a question, then
        </p>
        <div className="relative">
          <span
            className={clsx(
              "absolute top-1/6 left-1/6 inline-flex h-2/3 w-2/3 rounded-md bg-blue-300 opacity-75",
              {
                "animate-ping": !disabled,
              },
            )}
          />
          <Button
            ref={revealButtonRef}
            type="primary"
            htmlType="button"
            disabled={disabled}
            onClick={onClickShowAnswer}
            loading={loading}
            className="relative"
          >
            Reveal answer
          </Button>
        </div>
      </div>
    );
  }

  const [i, j] = activeClue;
  const myAnswer = answers.get(userId);
  const checkResult = answeredBy(i, j, userId);

  if (checkResult !== undefined) {
    const clueValue = getClueValue(activeClue, userId);
    const value = checkResult ? clueValue : -1 * clueValue;

    const uncheckedPlayers = Array.from(answers.keys())
      .map((uid) => players.get(uid))
      .filter((p): p is Player => p !== undefined)
      .filter((p) => answeredBy(i, j, p.userId) === undefined);

    return (
      <div className="flex flex-col items-center gap-2 p-2">
        <p className="font-bold text-white">
          You {checkResult ? "won" : "lost"}{" "}
          <span
            className={clsx("text-shadow", {
              "text-green-300": checkResult,
              "text-red-300": !checkResult,
            })}
          >
            {formatDollarsWithSign(value)}
          </span>
        </p>
        <p className="text-sm text-slate-300">
          Waiting for check(s) from{" "}
          {uncheckedPlayers.map((p) => p.name).join(", ")}...
        </p>
      </div>
    );
  }

  return (
    <fetcher.Form method="POST" action={`/room/${roomId}/check`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <CheckForm
        longForm={longForm}
        loading={loading}
        myAnswer={myAnswer}
        answer={clue.answer}
        playerName={playerName}
      />
    </fetcher.Form>
  );
}
