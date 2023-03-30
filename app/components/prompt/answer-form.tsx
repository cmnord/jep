import { useFetcher } from "@remix-run/react";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";
import Button from "../button";

function AnswerForm({ loading }: { loading: boolean }) {
  return (
    <div className="p-2 flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          id="answer"
          name="answer"
          placeholder="What is..."
          required
          className={
            "px-4 min-w-48 text-sm text-slate-900 border border-slate-300 rounded-lg bg-slate-50 " +
            "focus:ring-blue-500 focus:border-blue-500"
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
  const { activeClue, soloDispatch } = useEngineContext();
  if (!activeClue) {
    throw new Error("No active clue");
  }

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);
  const loading = fetcher.state === "loading";

  const [i, j] = activeClue;

  return (
    <fetcher.Form method="post" action={`/room/${roomName}/answer`}>
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
      <AnswerForm loading={loading} />
    </fetcher.Form>
  );
}
