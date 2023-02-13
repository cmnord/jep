import React from "react";
import { useNavigate } from "@remix-run/react";

import { Board } from "~/models/board.server";

interface Props {
  buttonText: string;
  title: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/** Preview is shown before a game or round starts. */
export default function Preview(props: Props) {
  const [showModal, setShowModal] = React.useState(true);

  const handleClickOK = () => {
    setShowModal(false);
    if (props.onClick) {
      props.onClick();
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div
      className="relative z-10"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    className="text-2xl font-medium leading-6 text-gray-900"
                    id="modal-title"
                  >
                    {props.title}
                  </h3>
                  <div className="mt-2">{props.children}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                onClick={handleClickOK}
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {props.buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SinglePreview(props: { onClick: () => void }) {
  // Month must be 0-indexed, so subtract 1.
  return (
    <Preview onClick={props.onClick} title="Play &rarr;" buttonText="Start">
      <p className="text-sm text-gray-500">Click to play</p>
    </Preview>
  );
}

export function DoublePreview(props: { onClick: () => void }) {
  return (
    <Preview
      onClick={props.onClick}
      title="Play Double &rarr;"
      buttonText="Start"
    >
      <p className="text-sm text-gray-500">
        Single round done! Click to play double
      </p>
    </Preview>
  );
}

export function FinalPreview(props: { onClick: () => void }) {
  return (
    <Preview
      onClick={props.onClick}
      title="Play Final &rarr;"
      buttonText="Start"
    >
      <p className="text-sm text-gray-500">
        Double round done! Click for Final prompt
      </p>
    </Preview>
  );
}

export function EndPreview({ board }: { board: Board }) {
  const navigate = useNavigate();

  const handleClickHome = () => {
    return navigate("/");
  };

  const finalClue = (() => {
    for (const category in board.clues) {
      const clues = board.clues[category];
      return clues[0];
    }
  })();

  return (
    <Preview title="Game over!" buttonText="Home" onClick={handleClickHome}>
      <p className="text-sm text-gray-500">The final answer was:</p>
      <div>
        <p className="text-sm text-gray-500">{finalClue?.clue}</p>
        <p className="text-sm text-gray-500">
          <strong>{finalClue?.answer}</strong>
        </p>
      </div>
    </Preview>
  );
}
