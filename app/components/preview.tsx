import { Link, useFetcher } from "@remix-run/react";

import Button from "~/components/button";
import Modal from "~/components/modal";
import Players from "~/components/player";
import type { Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";

function NextRoundFooter({
  roomName,
  round,
}: {
  roomName: string;
  round: number;
}) {
  const fetcher = useFetcher();
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
}: {
  isOpen: boolean;
  userId: string;
  roomName: string;
  round: number;
}) {
  const { boardControl, players } = useGameContext();
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
      <NextRoundFooter roomName={roomName} round={round} />
    </Modal>
  );
}

export default function Preview({
  numRounds,
  isOpen,
  finalClue,
  userId,
  roomName,
}: {
  numRounds: number;
  isOpen: boolean;
  finalClue?: Clue;
  userId: string;
  roomName: string;
}) {
  const { round } = useGameContext();

  switch (round) {
    case 0:
      return (
        <BeforeGamePreview
          isOpen={isOpen}
          userId={userId}
          roomName={roomName}
          round={round}
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
          <NextRoundFooter roomName={roomName} round={round} />
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
          <NextRoundFooter roomName={roomName} round={round} />
        </Modal>
      );
    default:
      return null;
  }
}
