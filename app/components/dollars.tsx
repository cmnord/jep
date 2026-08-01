import clsx from "clsx";

import { formatDollars, formatDollarsWithSign } from "~/utils";

/** Dollars renders a static dollar amount in the standard score style: bold
 * Inter, white when non-negative and red when negative. Assumes a dark
 * background.
 */
export function Dollars({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "font-inter font-bold",
        amount < 0 ? "text-red-400" : "text-white",
        className,
      )}
    >
      {formatDollars(amount)}
    </span>
  );
}

/** DollarsDiff renders a signed score change: bold Inter, green for gains and
 * red for losses. Set `onLight` on light backgrounds (e.g. inside a default
 * button), where the usual pale shades would be illegible.
 */
export function DollarsDiff({
  amount,
  onLight = false,
  className,
}: {
  amount: number;
  onLight?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "font-inter font-bold",
        onLight
          ? amount < 0
            ? "text-red-700"
            : "text-green-700"
          : ["text-shadow", amount < 0 ? "text-red-300" : "text-green-300"],
        className,
      )}
    >
      {formatDollarsWithSign(amount)}
    </span>
  );
}
