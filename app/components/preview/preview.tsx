import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Modal from "~/components/modal";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import SoundControl from "~/components/sound";
import type { Action, Player } from "~/engine";
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
    <Modal.Footer>
      <fetcher.Form method="POST" action={`/room/${roomName}/start`}>
        <input type="hidden" name="round" value={round} />
        <Button type="primary" htmlType="submit" onClick={onDismiss}>
          Start round
        </Button>
      </fetcher.Form>
    </Modal.Footer>
  );
}

function BeforeGamePreview({
  boardControl,
  isOpen,
  userId,
  roomName,
  players,
  round,
  soloDispatch,
  onDismiss,
}: {
  boardControl?: string;
  isOpen: boolean;
  userId: string;
  roomName: string;
  players: Map<string, Player>;
  round: number;
  soloDispatch: React.Dispatch<Action>;
  onDismiss: () => void;
}) {
  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : "Unknown player";

  const boardControlColor = boardController
    ? stringToHslColor(boardController.userId)
    : "gray";

  return (
    <Modal isOpen={isOpen}>
      <Modal.Body>
        <Modal.Title>
          <div className="grid grid-cols-3">
            <span />
            <p className="text-center">Play &rarr;</p>
            <div className="flex flex-row-reverse">
              <SoundControl showSlider={false} />
            </div>
          </div>
        </Modal.Title>
        <div className="flex flex-col gap-2">
          <p className="text-left">
            <span
              className="font-handwriting text-xl font-bold border-b-4"
              style={{ borderColor: boardControlColor }}
            >
              {boardControlName}
            </span>{" "}
            will start with control of the board.
          </p>
          <EditPlayerForm roomName={roomName} userId={userId} />
          <div className="flex gap-2 flex-wrap">
            {Array.from(players.values()).map((p, i) => (
              <PlayerIcon key={i} player={p} />
            ))}
          </div>
          <div className="bg-yellow-100 rounded-md my-3 p-3 shadow-md">
            <p className="font-handwriting text-3xl font-black text-yellow-900">
              how to play
            </p>
            <ul className="text-yellow-700 leading-relaxed text-sm">
              <li>
                <span className="text-lg">💁</span> Choose the clue when you
                have board control
              </li>
              <li>
                <span className="text-lg">⏱️</span> Wait for the clue to be read
              </li>
              <li>
                <span className="text-lg">🚨</span> Buzz in when you know the
                answer
              </li>
              <li>
                <span className="text-lg">🗣️</span> Answer out loud (no typing)
              </li>
              <li>
                <span className="text-lg">🙊</span> Check answers privately
                (don't say it!)
              </li>
              <li>
                <span className="text-lg">⚡</span> Swoop in when others are
                wrong
              </li>
              <li>
                <span className="text-lg">⚖️</span> Wager carefully on hidden
                Double Down clues
              </li>
            </ul>
          </div>
        </div>
      </Modal.Body>
      <NextRoundFooter
        roomName={roomName}
        round={round}
        soloDispatch={soloDispatch}
        onDismiss={onDismiss}
      />
    </Modal>
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

  if (round === 0) {
    return (
      <BeforeGamePreview
        isOpen={isOpen}
        boardControl={boardControl}
        userId={userId}
        roomName={roomName}
        players={players}
        round={round}
        soloDispatch={soloDispatch}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <Modal isOpen={isOpen}>
      <Modal.Body>
        <Modal.Title>
          Play round {round + 1}/{numRounds} &rarr;
        </Modal.Title>
        <p className="text-slate-500">Round {round} done!</p>
      </Modal.Body>
      <NextRoundFooter
        roomName={roomName}
        round={round}
        soloDispatch={soloDispatch}
        onDismiss={onDismiss}
      />
    </Modal>
  );
}
