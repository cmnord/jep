import classNames from "classnames";
import * as React from "react";

import Popover from "~/components/popover";
import { UNREVEALED_CLUE } from "~/engine/engine";
import type { Clue } from "~/models/convert.server";

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
          "px-4 py-3 relative h-full w-full group bg-blue-1000  transition-colors",
          {
            "hover:bg-blue-700 focus:bg-blue-700": !unrevealed,
            "bg-slate-800": unrevealed,
            "border-spin opacity-75": loading,
          }
        )}
        ref={ref}
        {...rest}
      >
        <p
          className={classNames(
            "flex items-center justify-center gap-1 text-yellow-1000 text-shadow-md sm:text-shadow-lg font-impact",
            {
              "opacity-0 group-hover:opacity-50 group-focus:opacity-50":
                answered,
            }
          )}
        >
          <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
          <span className="text-md sm:text-4xl lg:text-5xl">{value}</span>
        </p>
      </button>
    );
  }
);
ClueButton.displayName = "ClueButton";

export function ClueComponent(props: Props) {
  return (
    <td className="sm:p-1 h-full">
      {props.answered ? (
        <Popover
          content={
            <p>
              {props.clue.clue}
              <br />
              <span className="uppercase">{props.clue.answer}</span>
            </p>
          }
        >
          <ClueButton {...props} />
        </Popover>
      ) : (
        <ClueButton {...props} />
      )}
    </td>
  );
}
