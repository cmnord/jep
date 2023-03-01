import { useFetcher } from "@remix-run/react";
import Button from "~/components/button";

export default function AnswerForm({
  roomName,
  userId,
  i,
  j,
}: {
  roomName: string;
  userId: string;
  i: number;
  j: number;
}) {
  const fetcher = useFetcher();
  const loading = fetcher.state === "loading";

  return (
    <fetcher.Form
      method="post"
      action={`/room/${roomName}/answer`}
      className="p-2 flex flex-col items-center gap-2"
    >
      <input type="hidden" value={userId} name="userId" />
      <input type="hidden" value={i} name="i" />
      <input type="hidden" value={j} name="j" />
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
    </fetcher.Form>
  );
}
