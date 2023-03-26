import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Modal from "~/components/modal";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import SoundControl from "~/components/sound";
import type { Action, Player } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import type { Clue } from "~/models/convert.server";
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
      <fetcher.Form method="post" action={`/room/${roomName}/start`}>
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
              className="font-bold border-b-4"
              style={{
                borderColor: boardControlColor,
              }}
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

function AfterGamePreview({ clue }: { clue?: Clue }) {
  return (
    <div className="px-3 pt-3 sm:px-6 sm:pt-6 md:px-12 md:pt-12">
      <h2 className="text-2xl font-semibold mb-4">Game over!</h2>
      {clue ? (
        <div className="flex flex-col gap-4 mb-6">
          <p className="mb-2">The final answer was:</p>
          <blockquote className="relative border-l-4 pl-4 sm:pl-6 dark:border-slate-700">
            <p className="text-slate-800 sm:text-xl uppercase font-bold">
              {clue.clue}
            </p>
          </blockquote>
          <p>
            <em>
              What is{" "}
              <span className="uppercase font-bold text-sm bg-cyan-200 rounded-md p-1.5">
                {clue?.answer}
              </span>
              ?
            </em>
          </p>
        </div>
      ) : null}
      <hr className="my-4" />
      <h2 className="text-2xl font-semibold mb-4">Final scores:</h2>
    </div>
  );
}

export function Preview({
  numRounds,
  finalClue,
  userId,
  roomName,
  onDismiss,
}: {
  numRounds: number;
  finalClue?: Clue;
  userId: string;
  roomName: string;
  onDismiss: () => void;
}) {
  const { type, boardControl, players, round, soloDispatch } =
    useEngineContext();

  const isOpen = type === GameState.PreviewRound;

  switch (round) {
    case 0:
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
    case numRounds:
      return <AfterGamePreview clue={finalClue} />;
    default:
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
}
