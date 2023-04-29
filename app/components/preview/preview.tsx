import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
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

function HowToPlay() {
  return (
    <div className="mb-4 rounded-md bg-yellow-100 p-3 shadow-md">
      <p className="font-handwriting text-3xl font-black text-yellow-900">
        how to play
      </p>
      <ul className="text-sm leading-relaxed text-yellow-700">
        <li>
          <span className="text-lg">💁</span> Choose the clue when you have
          board control
        </li>
        <li>
          <span className="text-lg">⏱️</span> Wait for the clue to be read
        </li>
        <li>
          <span className="text-lg">🚨</span> Buzz in when you know the answer
        </li>
        <li>
          <span className="text-lg">🗣️</span> Answer out loud (no typing)
        </li>
        <li>
          <span className="text-lg">🙊</span> Check answers privately (don't say
          it!)
        </li>
        <li>
          <span className="text-lg">⚡</span> Swoop in when others are wrong
        </li>
        <li>
          <span className="text-lg">⚖️</span> Wager carefully on hidden Double
          Down clues
        </li>
      </ul>
    </div>
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
