import { useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import Input from "~/components/input";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import useSoloAction from "~/utils/use-solo-action";

function AnswerForm({
  submittedAnswer,
  loading,
}: {
  submittedAnswer?: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {submittedAnswer ? (
        <>
          <p className="font-bold text-white">
            You answered:{" "}
            <span className="font-handwriting text-xl font-bold">
              {submittedAnswer}
            </span>
          </p>
          <p className="text-sm text-slate-300">
            You can change your answer until the last player submits an answer.
          </p>
        </>
      ) : null}
      <div className="flex gap-2">
        <Input
          type="text"
          id="answer"
          name="answer"
          placeholder="What is..."
          required
          className={`min-w-48 font-handwriting text-xl font-bold
          placeholder:font-sans placeholder:font-normal`}
        />
        <Button type="primary" htmlType="submit" loading={loading}>
          submit
        </Button>
      </div>
    </div>
  );
}

export function ConnectedAnswerForm({ roomId, userId }: RoomProps) {
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
    <fetcher.Form method="POST" action={`/room/${roomId}/answer`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <AnswerForm submittedAnswer={submittedAnswer} loading={loading} />
    </fetcher.Form>
  );
}
