import { useFetcher } from "@remix-run/react";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";
import Button from "../button";

function AnswerForm({
  submittedAnswer,
  loading,
}: {
  submittedAnswer?: string;
  loading: boolean;
}) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      {submittedAnswer ? (
        <>
          <p className="text-white font-bold">
            You answered:{" "}
            <span className="text-xl font-handwriting font-bold">
              {submittedAnswer}
            </span>
          </p>
          <p className="text-sm text-slate-300">
            You can change your answer until the last player submits an answer.
          </p>
        </>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          id="answer"
          name="answer"
          placeholder="What is..."
          required
          className={
            "px-4 min-w-48 text-xl font-handwriting font-bold text-slate-900 border border-slate-300 rounded-lg bg-slate-50 " +
            "focus:ring-blue-500 focus:border-blue-500 " +
            "placeholder:font-sans placeholder:text-sm placeholder:font-normal"
          }
        />
        <Button htmlType="submit" type="primary" loading={loading}>
          submit
        </Button>
      </div>
    </div>
  );
}

export function ConnectedAnswerForm({
  roomName,
  userId,
}: {
  roomName: string;
  userId: string;
}) {
  const { activeClue, answers, soloDispatch } = useEngineContext();
  if (!activeClue) {
    throw new Error("No active clue");
  }

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const [i, j] = activeClue;
  const submittedAnswer = answers.get(userId);

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/answer`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <AnswerForm submittedAnswer={submittedAnswer} loading={loading} />
    </fetcher.Form>
  );
}
