import { useFetcher } from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
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
}: {
  answer: string;
  longForm: boolean;
  loading: boolean;
  myAnswer?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {!longForm && (
        <>
          <p className="text-center font-korinna text-2xl font-bold uppercase text-slate-300 shadow-sm">
            {answer}
          </p>
          <p className="text-center text-sm text-slate-300">
            (don't spoil the answer for others!)
          </p>
        </>
      )}
      {myAnswer && (
        <p className="text-center text-sm text-slate-300">
          Your answer:{" "}
          <span className="font-handwriting text-2xl font-bold text-white">
            {myAnswer}
          </span>
        </p>
      )}
      <p className="font-bold text-white">Were you right?</p>
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
}: {
  longForm?: boolean;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
} & RoomProps) {
  const { activeClue, clue, answeredBy, answers, getClueValue, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  // Disable the "show answer" button briefly on render to prevent
  // double-clicks.
  const [disabled, setDisabled] = React.useState(true);
  useTimeout(
    () => setDisabled(false),
    showAnswer ? null : REVEAL_ANSWER_DEBOUNCE_MS
  );

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
            className={classNames(
              "absolute left-1/6 top-1/6 inline-flex h-2/3 w-2/3 rounded-md bg-blue-300 opacity-75",
              {
                "animate-ping": !disabled,
              }
            )}
          />
          <Button
            type="primary"
            htmlType="button"
            autoFocus={!disabled}
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

    return (
      <div className="flex flex-col items-center gap-2 p-2">
        <p className="font-bold text-white">
          You {checkResult ? "won" : "lost"}{" "}
          <span
            className={classNames("text-shadow", {
              "text-green-300": checkResult,
              "text-red-300": !checkResult,
            })}
          >
            {formatDollarsWithSign(value)}
          </span>
        </p>
        <p className="text-sm text-slate-300">
          Waiting for other players to check...
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
      />
    </fetcher.Form>
  );
}
