import { useFetcher } from "@remix-run/react";
import classNames from "classnames";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";

function AnswerForm({ loading }: { loading: boolean }) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <p className="text-white font-bold">Was your answer correct?</p>
      <p className="text-gray-300 text-sm text-center">
        Only you can see the answer for now. After this, it will be revealed to
        all players.
      </p>
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

/** ConnectedAnswerForm is shown to the winning buzzer at the bottom of the
 * prompt.  They can reveal the answer, then mark it correct/incorrect.
 */
export function ConnectedAnswerForm({
  isOpen,
  roomName,
  userId,
  clueIdx,
  showAnswer,
  onClickShowAnswer,
  loading,
}: {
  isOpen: boolean;
  roomName: string;
  userId: string;
  clueIdx: [number, number] | undefined;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
  loading: boolean;
}) {
  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  const { soloDispatch } = useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const fetcherLoading = fetcher.state === "loading";

  if (!showAnswer) {
    return (
      <div
        className={classNames("p-2 flex flex-col items-center gap-2", {
          "opacity-0": !isOpen,
        })}
      >
        <p className="text-gray-300 text-sm">
          State your answer in the form of a question, then
        </p>
        <Button
          type="primary"
          htmlType="button"
          disabled={!isOpen}
          autoFocus={isOpen}
          onClick={onClickShowAnswer}
          loading={loading}
        >
          Reveal answer
        </Button>
      </div>
    );
  }

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/answer`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <AnswerForm loading={fetcherLoading} />
    </fetcher.Form>
  );
}
