import clsx from "clsx";
import * as React from "react";

import Popover from "~/components/popover";
import { clueIsPlayable } from "~/engine";
import type { Clue } from "~/models/convert.server";
import { useIsHostMode } from "~/utils/use-host-mode";

type ButtonProps = React.ComponentProps<"button">;

interface Props {
  answered: boolean;
  clue: Clue;
  hasBoardControl: boolean;
  hidden?: boolean;
  onFocus: NonNullable<ButtonProps["onFocus"]>;
  onClick: NonNullable<ButtonProps["onClick"]>;
  onKeyDown: NonNullable<ButtonProps["onKeyDown"]>;
}

const ClueButton = React.forwardRef<HTMLButtonElement, ButtonProps & Props>(
  (
    {
      answered,
      clue,
      hasBoardControl,
      hidden,
      onFocus,
      onClick,
      onKeyDown,
      ...rest
    },
    ref,
  ) => {
    const [loading, setLoading] = React.useState(false);
    const isHostMode = useIsHostMode();

    const playable = clueIsPlayable(clue);

    React.useEffect(() => {
      if (answered) {
        setLoading(false);
      }
    }, [answered]);

    // disabled must not include `answered` or `hasBoardControl` so we can focus
    // on clues.
    const disabled = !playable || loading;

    return (
      <button
        type="submit"
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }
          if (!answered && hasBoardControl) {
            setLoading(true);
          }
          onClick(event);
        }}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (!answered && event.key === "Enter" && hasBoardControl) {
            setLoading(true);
          }
          onKeyDown(event);
        }}
        className={clsx(
          "group relative h-full w-full bg-blue-bright px-4 py-3 transition-colors",
          {
            "hover:bg-blue-700 focus:bg-blue-700": playable,
            "bg-slate-800": !playable,
            "border-spin opacity-75": loading,
          },
        )}
        ref={ref}
        {...rest}
      >
        <p
          style={hidden ? { visibility: "hidden" } : undefined}
          className={clsx(
            "flex items-center justify-center gap-1 font-inter font-bold text-yellow-1000 text-shadow-md sm:text-shadow-lg",
            {
              "opacity-0 group-hover:opacity-50 group-focus:opacity-50":
                answered,
            },
          )}
        >
          <span className="text-sm sm:text-3xl lg:text-4xl">$</span>
          <span className="text-md sm:text-4xl lg:text-5xl">{clue.value}</span>
        </p>
        {isHostMode && (
          <div className="mt-1 text-center">
            <p className="text-xs font-medium text-cyan-300">{clue.answer}</p>
            {answered && (
              <p className="text-xs font-medium text-green-300">Answered</p>
            )}
            {clue.wagerable && (
              <p className="text-xs font-medium text-orange-300">Wagerable</p>
            )}
            {clue.longForm && (
              <p className="text-xs font-medium text-purple-300">Long Form</p>
            )}
          </div>
        )}
      </button>
    );
  },
);
ClueButton.displayName = "ClueButton";

export function ClueComponent(props: Props) {
  return (
    <td className="h-full border-2 border-blue-925">
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
