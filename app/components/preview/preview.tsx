import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import HowToPlay from "~/components/how-to-play";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import SoundControl from "~/components/sound";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { useSoloAction } from "~/utils/use-solo-action";
import { stringToHslColor } from "~/utils/utils";

function NextRoundFooter({
  roomName,
  round,
  soloDispatch,
  onDismiss,
}: {
  roomName: string;
  round: number;
  soloDispatch: React.Dispatch<Action>;
  onDismiss?: () => void;
}) {
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  return (
    <Dialog.Footer>
      <fetcher.Form method="POST" action={`/room/${roomName}/start`}>
        <input type="hidden" name="round" value={round} />
        <Button type="primary" htmlType="submit" onClick={onDismiss}>
          Start round
        </Button>
      </fetcher.Form>
    </Dialog.Footer>
  );
}

export function Preview({
  numRounds,
  userId,
  roomName,
  onDismiss,
}: {
  numRounds: number;
  userId: string;
  roomName: string;
  onDismiss: () => void;
}) {
  const { type, boardControl, players, round, soloDispatch } =
    useEngineContext();

  const isOpen = type === GameState.PreviewRound;

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

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
        <>
          <span
            className="border-b-4 font-handwriting text-xl font-bold"
            style={{ borderColor }}
          >
            {boardControlName}
          </span>{" "}
          will start with control of the board.
        </>
      }
    >
      {round === 0 ? (
        <div className="flex flex-col gap-2">
          <EditPlayerForm roomName={roomName} userId={userId} />
          <div className="flex flex-wrap gap-2">
            {Array.from(players.values()).map((p, i) => (
              <PlayerIcon key={i} player={p} />
            ))}
          </div>
          <HowToPlay />
        </div>
      ) : null}
      <NextRoundFooter
        roomName={roomName}
        round={round}
        soloDispatch={soloDispatch}
        onDismiss={onDismiss}
      />
    </Dialog>
  );
}
