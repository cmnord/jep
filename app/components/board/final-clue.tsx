import clsx from "clsx";
import * as React from "react";

import useFitText from "~/utils/use-fit-text";

type ButtonProps = React.ComponentProps<"button">;

export function FinalClue({
  answered,
  category,
  onFocus,
  onClick,
  onKeyDown,
}: {
  answered: boolean;
  category: string;
  onFocus: NonNullable<ButtonProps["onFocus"]>;
  onClick: NonNullable<ButtonProps["onClick"]>;
  onKeyDown: NonNullable<ButtonProps["onKeyDown"]>;
}) {
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (answered) {
      setLoading(false);
    }
  }, [answered]);

  const { fontSize, ref } = useFitText<HTMLParagraphElement>({
    maxFontSize: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-screen-lg grow flex-col justify-center">
      <button
        type="submit"
        disabled={loading}
        onClick={(event) => {
          if (loading) {
            return;
          }
          if (!answered) {
            setLoading(true);
          }
          onClick(event);
        }}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (loading) {
            return;
          }
          if (!answered && event.key === "Enter") {
            setLoading(true);
          }
          onKeyDown(event);
        }}
        className={clsx(
          "group relative h-full w-full grow border-8 border-black bg-blue-1000 px-6 py-8 transition-colors hover:bg-blue-700 focus:bg-blue-700",
          {
            "border-spin opacity-75": loading,
          },
        )}
      >
        <p
          ref={ref}
          className={clsx(
            `flex items-center justify-center gap-1 font-korinna text-white uppercase transition-opacity duration-150 text-shadow-md sm:text-shadow-lg`,
            {
              "opacity-0 group-hover:opacity-50 group-focus:opacity-50":
                answered,
            },
          )}
          style={{ fontSize, opacity: fontSize ? undefined : 0 }}
        >
          {category}
        </p>
      </button>
    </div>
  );
}
