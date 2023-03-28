import { useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";

function CheckForm({ loading }: { loading: boolean }) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <p className="text-white font-bold">Were you right?</p>
      <p className="text-slate-300 text-sm text-center">
        (only you can see this answer)
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

/** ConnectedCheckForm is shown to the winning buzzer at the bottom of the
 * prompt. They reveal the answer, then check whether it's correct or
 * incorrect.
 */
export function ConnectedCheckForm({
  roomName,
  userId,
  clueIdx,
  showAnswer,
  onClickShowAnswer,
}: {
  roomName: string;
  userId: string;
  clueIdx: [number, number] | undefined;
  showAnswer: boolean;
  onClickShowAnswer: () => void;
}) {
  const [i, j] = clueIdx ? clueIdx : [-1, -1];

  const { soloDispatch } = useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

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

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/check`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <CheckForm loading={loading} />
    </fetcher.Form>
  );
}
