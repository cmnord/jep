import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";
import { formatDollarsWithSign } from "~/utils/utils";

function CheckForm({
  longForm,
  loading,
  myAnswer,
}: {
  longForm: boolean;
  loading: boolean;
  myAnswer?: string;
}) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <p className="text-white font-bold">Were you right?</p>
      {!longForm && (
        <p className="text-slate-300 text-sm text-center">
          (only you can see this answer)
        </p>
      )}
      {myAnswer && (
        <p className="text-slate-300 text-sm text-center">
          Your answer:{" "}
          <span className="font-handwriting text-2xl font-bold text-white">
            {myAnswer}
          </span>
        </p>
      )}
      <div className="flex gap-2">
        <Button
          htmlType="submit"
          name="result"
          value="incorrect"
          loading={loading}
        >
          incorrect!
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
  roomName,
  userId,
  longForm = false,
  showAnswer,
  onClickShowAnswer,
}: {
  roomName: string;
  userId: string;
  longForm?: boolean;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
}) {
  const { activeClue, answeredBy, answers, getClueValue, soloDispatch } =
    useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  if (!activeClue) {
    throw new Error("No active clue");
  }

  if (!showAnswer) {
    return (
      <div className="p-2 flex flex-col items-center gap-2">
        <p className="text-slate-300 text-sm">
          Answer in the form of a question, then
        </p>
        <div className="relative">
          <span className="absolute inline-flex top-1/6 left-1/6 h-2/3 w-2/3 rounded-md bg-blue-300 opacity-75 animate-ping"></span>
          <Button
            type="primary"
            htmlType="button"
            autoFocus
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
      <div className="p-2 flex flex-col items-center gap-2">
        <p className="text-white font-bold">
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
        <p className="text-slate-300 text-sm">
          Waiting for other players to check...
        </p>
      </div>
    );
  }

  return (
    <fetcher.Form method="POST" action={`/room/${roomName}/check`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <CheckForm longForm={longForm} loading={loading} myAnswer={myAnswer} />
    </fetcher.Form>
  );
}
