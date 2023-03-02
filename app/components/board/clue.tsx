import classNames from "classnames";
import * as React from "react";

import type { Clue } from "~/models/convert.server";
import LoadingSpinner from "../loading-spinner";

const UNREVEALED_CLUE = "unrevealed";

export function ClueComponent({
  answered,
  clue,
  disabled,
  onFocus,
  onKeyDown,
  onClick,
  value,
}: {
  answered: boolean;
  clue: Clue;
  value: number;
  disabled: boolean;
  onFocus: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const unrevealed = clue.clue.toLowerCase() === UNREVEALED_CLUE;

  // TODO: daily double / wagerable text
  const clueText = answered ? (
    unrevealed ? (
      <p className="text-sm text-gray-400">{UNREVEALED_CLUE}</p>
    ) : (
      <p className="uppercase font-korinna break-words">{clue.answer}</p>
    )
  ) : (
    <p className="text-4xl lg:text-5xl text-yellow-1000 text-shadow-md font-impact">
      ${value} {loading && <LoadingSpinner />}
    </p>
  );

  return (
    <td className="p-1 h-full">
      <button
        type="submit"
        disabled={disabled || unrevealed}
        onClick={(e) => {
          e.preventDefault();
          setLoading(true);
          onClick();
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className={classNames(
          "px-4 py-3 h-full w-full bg-blue-1000  transition-colors",
          {
            "hover:bg-blue-700 focus:bg-blue-700": !unrevealed,
            "text-blue-1000 hover:text-white focus:text-white hover:text-shadow focus:text-shadow transition":
              answered && !unrevealed,
            "bg-gray-800 ": unrevealed,
          }
        )}
      >
        {clueText}
      </button>
    </td>
  );
}
