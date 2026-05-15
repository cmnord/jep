import { useFetcher } from "react-router";

import Button from "~/components/button";
import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { useEngineContext } from "~/engine";
import { formatDollarsWithSign } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

export default function CheckCorrectionButton({ roomId, userId }: RoomProps) {
  const { getCheckCorrection, soloDispatch } = useEngineContext();
  const correction = getCheckCorrection(userId);
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  if (!correction) {
    return null;
  }

  const nextCorrect = !correction.correct;
  const scoreSwing = correction.value * 2 * (nextCorrect ? 1 : -1);
  const result = nextCorrect ? "correct" : "incorrect";

  return (
    <fetcher.Form
      method="POST"
      action={`/room/${roomId}/correct-check`}
      className="ml-auto"
    >
      <input type="hidden" name="round" value={correction.round} />
      <input type="hidden" name="i" value={correction.i} />
      <input type="hidden" name="j" value={correction.j} />
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="transparent"
        htmlType="submit"
        name="result"
        value={result}
        loading={fetcher.state === "loading"}
        className="whitespace-nowrap"
      >
        Mark previous answer {result} ({formatDollarsWithSign(scoreSwing)})
      </Button>
    </fetcher.Form>
  );
}
