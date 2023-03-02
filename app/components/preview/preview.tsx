import { Link, useFetcher } from "@remix-run/react";
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
}: {
  roomName: string;
  round: number;
  soloDispatch: React.Dispatch<Action>;
}) {
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  return (
    <Modal.Footer>
      <fetcher.Form method="post" action={`/room/${roomName}/start`}>
        <input type="hidden" name="round" value={round} />
        <Button type="primary" htmlType="submit">
          Start
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
}: {
  isOpen: boolean;
  userId: string;
  roomName: string;
  round: number;
  soloDispatch: React.Dispatch<Action>;
}) {
  const { boardControl, players } = useEngineContext();
  const controllingPlayer = boardControl ? players.get(boardControl) : null;

  return (
    <Modal isOpen={isOpen}>
      <Modal.Body>
        <Modal.Title>Play &rarr;</Modal.Title>
        <div className="mb-4">
          <Players userId={userId} roomName={roomName} />
        </div>
        <p className="text-gray-500 mb-4">
          Click "Start" to start the game for all players.
          {controllingPlayer && (
            <span>
              {" "}
              <span className="font-bold">{controllingPlayer.name}</span> will
              start with control of the board.
            </span>
          )}
        </p>
      </Modal.Body>
      <NextRoundFooter
        roomName={roomName}
        round={round}
        soloDispatch={soloDispatch}
      />
    </Modal>
  );
}

export function Preview({
  numRounds,
  finalClue,
  userId,
  roomName,
}: {
  numRounds: number;
  finalClue?: Clue;
  userId: string;
  roomName: string;
}) {
  const { type, round, soloDispatch } = useEngineContext();

  const isOpen = type === GameState.Preview;

  switch (round) {
    case 0:
      return (
        <BeforeGamePreview
          isOpen={isOpen}
          userId={userId}
          roomName={roomName}
          round={round}
          soloDispatch={soloDispatch}
        />
      );
    case numRounds:
      return (
        <Modal isOpen={isOpen}>
          <Modal.Body>
            <Modal.Title>Game over!</Modal.Title>
            <p className="text-gray-500">The final answer was:</p>
            <div>
              <p className="text-gray-500">{finalClue?.clue}</p>
              <p className="text-gray-500">
                <strong>{finalClue?.answer}</strong>
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Link to="/">
              <Button type="primary">Home</Button>
            </Link>
          </Modal.Footer>
        </Modal>
      );
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
