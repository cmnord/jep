import { useFetcher } from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import Modal from "~/components/modal";
import Players from "~/components/player";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import type { Clue } from "~/models/convert.server";
import { useSoloAction } from "~/utils/use-solo-action";

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
  isOpen,
  userId,
  roomName,
  round,
  soloDispatch,
  onDismiss,
}: {
  isOpen: boolean;
  userId: string;
  roomName: string;
  round: number;
  soloDispatch: React.Dispatch<Action>;
  onDismiss: () => void;
}) {
  return (
    <Modal isOpen={isOpen}>
      <Modal.Body>
        <Modal.Title>Play &rarr;</Modal.Title>
        <Players userId={userId} roomName={roomName} />
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
          <blockquote className="relative border-l-4 pl-4 sm:pl-6 dark:border-gray-700">
            <p className="text-gray-800 sm:text-xl uppercase font-bold">
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
  const { type, round, soloDispatch } = useEngineContext();

  const isOpen = type === GameState.PreviewRound;

  switch (round) {
    case 0:
      return (
        <BeforeGamePreview
          isOpen={isOpen}
          userId={userId}
          roomName={roomName}
          round={round}
          soloDispatch={soloDispatch}
          onDismiss={onDismiss}
        />
      );
    case numRounds:
      return <AfterGamePreview clue={finalClue} />;
    case numRounds - 1:
      return (
        <Modal isOpen={isOpen}>
          <Modal.Body>
            <Modal.Title>Play Final &rarr;</Modal.Title>
            <p className="text-gray-500">Round done! Click for final prompt</p>
          </Modal.Body>
          <NextRoundFooter
            roomName={roomName}
            round={round}
            soloDispatch={soloDispatch}
            onDismiss={onDismiss}
          />
        </Modal>
      );
    case 1:
      return (
        <Modal isOpen={isOpen}>
          <Modal.Body>
            <Modal.Title>Play Double &rarr;</Modal.Title>
            <p className="text-gray-500">
              Single round done! Click to play double
            </p>
          </Modal.Body>
          <NextRoundFooter
            roomName={roomName}
            round={round}
            soloDispatch={soloDispatch}
          />
        </Modal>
      );
    default:
      return null;
  }
}
