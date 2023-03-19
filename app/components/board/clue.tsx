import classNames from "classnames";
import * as React from "react";

import Popover from "~/components/popover";
import type { Clue } from "~/models/convert.server";

const UNREVEALED_CLUE = "unrevealed";

interface Props {
  answered: boolean;
  clue: Clue;
  value: number;
  hasBoardControl: boolean;
  onFocus: () => void;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const ClueButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & Props
>(
  (
    {
      answered,
      clue,
      value,
      hasBoardControl,
      onFocus,
      onClick,
      onKeyDown,
      ...rest
    },
    ref
  ) => {
    const [loading, setLoading] = React.useState(false);

    const unrevealed = clue.clue.toLowerCase() === UNREVEALED_CLUE;

    React.useEffect(() => {
      if (answered) {
        setLoading(false);
      }
    }, [answered]);

    // TODO: daily double / wagerable text
    const clueText = answered ? (
      unrevealed ? (
        <p className="text-sm text-gray-400">{UNREVEALED_CLUE}</p>
      ) : (
        <p className="uppercase font-korinna break-words">{clue.answer}</p>
      )
    ) : (
      <p className="flex items-center justify-center gap-1 text-yellow-1000 text-shadow-lg font-impact">
        <span className="text-3xl lg:text-4xl">$</span>
        <span className="text-4xl lg:text-5xl">{value}</span>
      </p>
    );

    // disabled must not include `answerable` so we can focus on answered clues.
    const disabled = !hasBoardControl || unrevealed || loading;

    return (
      <button
        type="submit"
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }
          if (!answered) {
            setLoading(true);
          }
          onClick(event);
        }}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (!answered && event.key === "Enter") {
            setLoading(true);
          }
          onKeyDown(event);
        }}
        className={classNames(
          "px-4 py-3 relative h-full w-full bg-blue-1000  transition-colors",
          {
            "hover:bg-blue-700 focus:bg-blue-700": !unrevealed,
            "text-blue-1000 hover:text-white focus:text-white hover:text-shadow focus:text-shadow transition":
              answered && !unrevealed,
            "bg-gray-800": unrevealed,
            "border-spin opacity-75": loading,
          }
        )}
        ref={ref}
        {...rest}
      >
        {clueText}
      </button>
    );
  }
);
ClueButton.displayName = "ClueButton";

export function ClueComponent(props: Props) {
  return (
    <td className="p-1 h-full">
      {props.answered ? (
        <Popover content={props.clue.clue}>
          <ClueButton {...props} />
        </Popover>
      ) : (
        <ClueButton {...props} />
      )}
    </td>
  );
}
