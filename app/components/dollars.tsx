import clsx from "clsx";

import { formatDollars, formatDollarsWithSign } from "~/utils";

/** Dollars renders a static dollar amount in the standard score style: bold
 * Inter, white when non-negative and red when negative. Assumes a dark
 * background.
 */
export function Dollars({
  amount,
  variant = "default",
}: {
  amount: number;
  variant?: "default" | "score" | "interactiveScore" | "reveal";
}) {
  return (
    <span
      className={clsx(
        "font-inter font-bold",
        amount < 0 ? "text-red-400" : "text-white",
        {
          "block text-shadow-md":
            variant === "score" || variant === "interactiveScore",
          // Safari requires the decoration on the text itself and an opaque
          // color when combined with text-shadow.
          "underline decoration-white decoration-dotted decoration-2 underline-offset-4":
            variant === "interactiveScore",
          "text-xl": variant === "reveal",
        },
      )}
    >
      {formatDollars(amount)}
    </span>
  );
}

/** DollarsDiff renders a signed score change: bold Inter, green for gains and
 * red for losses.
 */
export function DollarsDiff({
  amount,
  variant = "default",
}: {
  amount: number;
  variant?: "default" | "onLight" | "floating";
}) {
  return (
    <span
      className={clsx(
        "font-inter font-bold",
        variant === "onLight"
          ? amount < 0
            ? "text-red-700"
            : "text-green-700"
          : ["text-shadow", amount < 0 ? "text-red-300" : "text-green-300"],
        variant === "floating"
          ? "absolute -top-1/4 -right-1/2 animate-bounce whitespace-nowrap"
          : null,
      )}
    >
      {formatDollarsWithSign(amount)}
    </span>
  );
}
