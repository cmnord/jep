import { Link } from "@remix-run/react";

import Modal from "~/components/modal";
import { Clue } from "~/models/convert.server";
import { useGameContext } from "~/utils/use-game-context";
import Players, { PlayerIcon } from "./player";

export default function Preview({
  numRounds,
  isOpen,
  onClose,
  finalClue,
  players = new Set(),
  userId,
}: {
  numRounds: number;
  isOpen: boolean;
  onClose: () => void;
  finalClue?: Clue;
  players: Set<{ userId: string; name: string }>;
  userId: string;
}) {
  const { round } = useGameContext();

  switch (round) {
    case numRounds:
      return (
        <Modal
          isOpen={isOpen}
          title="Game over!"
          buttonContent={<Link to="/">Home</Link>}
        >
          <p className="text-gray-500">The final answer was:</p>
          <div>
            <p className="text-gray-500">{finalClue?.clue}</p>
            <p className="text-gray-500">
              <strong>{finalClue?.answer}</strong>
            </p>
          </div>
        </Modal>
      );

    case numRounds - 1:
      return (
        <Modal
          isOpen={isOpen}
          onClick={onClose}
          title="Play Final &rarr;"
          buttonContent="Start"
        >
          <p className="text-gray-500">Round done! Click for final prompt</p>
        </Modal>
      );
    case 0:
      return (
        <Modal
          isOpen={isOpen}
          onClick={onClose}
          title="Play &rarr;"
          buttonContent="Start"
        >
          <p className="text-gray-500 mb-4">Click to play</p>
          <Players players={players} userId={userId} />
        </Modal>
      );
    case 1:
      return (
        <Modal
          isOpen={isOpen}
          onClick={onClose}
          title="Play Double &rarr;"
          buttonContent="Start"
        >
          <p className="text-gray-500">
            Single round done! Click to play double
          </p>
        </Modal>
      );
    default:
      return null;
  }
}
