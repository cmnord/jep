import { useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import Dialog from "~/components/dialog";
import type { RoomProps } from "~/components/game";
import HowToPlay from "~/components/how-to-play";
import Link from "~/components/link";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import SoundControl from "~/components/sound";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { stringToHslColor } from "~/utils";
import useSoloAction from "~/utils/use-solo-action";

export function Preview({
  numRounds,
  roomId,
  userId,
  onDismiss,
  url,
}: {
  numRounds: number;
  onDismiss: () => void;
  url: string;
} & RoomProps) {
  const { type, board, boardControl, players, round, soloDispatch } =
    useEngineContext();

  const isOpen = type === GameState.PreviewRound;

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  if (!board) return null;

  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    board.categories[0].clues[0].longForm;

  const borderColor = boardController
    ? stringToHslColor(boardController.userId)
    : "gray";

  return (
    <Dialog
      isOpen={isOpen}
      title={
        <div className="flex justify-between">
          <span>
            Start round {round + 1} of {numRounds}
          </span>
          <SoundControl showSlider={false} />
        </div>
      }
      description={
        isSingleLongFormClue ? null : (
          <>
            <span
              className="border-b-4 font-handwriting text-xl font-bold"
              style={{ borderColor }}
            >
              {boardControlName}
            </span>{" "}
            will start with control of the board.
          </>
        )
      }
    >
      {round === 0 ? (
        <div className="flex flex-col gap-2">
          <EditPlayerForm roomId={roomId} userId={userId} />
          <div className="flex flex-wrap gap-2">
            {Array.from(players.values()).map((p, i) => (
              <PlayerIcon key={i} player={p} />
            ))}
          </div>
          <HowToPlay />
          <Link className="mb-2 text-sm" to="/howto">
            Practice buzzing &rarr;
          </Link>
        </div>
      ) : null}
      <Dialog.Footer>
        <CopyLinkButton url={url} text="Copy link to room" />
        <fetcher.Form method="POST" action={`/room/${roomId}/start`}>
          <input type="hidden" name="round" value={round} />
          <Button type="primary" htmlType="submit" onClick={onDismiss}>
            Start round
          </Button>
        </fetcher.Form>
      </Dialog.Footer>
    </Dialog>
  );
}
