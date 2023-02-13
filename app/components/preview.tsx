import { Link } from "@remix-run/react";
import { Clue } from "~/models/clue.server";
import Modal from "./modal";

export default function Preview({
  round,
  numRounds,
  isOpen,
  onClose,
  finalClue,
}: {
  round: number;
  numRounds: number;
  isOpen: boolean;
  onClose: () => void;
  finalClue?: Clue;
}) {
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
          <p className="text-gray-500">Click to play</p>
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
