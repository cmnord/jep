import classNames from "classnames";

/** ReadClueTimer is a white bar which scrolls across the screen for
 * clueDurationMs. */
export function ReadClueTimer({
  clueDurationMs,
  shouldAnimate,
}: {
  clueDurationMs: number;
  shouldAnimate: boolean;
}) {
  return (
    <div
      className={classNames("h-8 mt-2 self-start", {
        "w-0 bg-white": shouldAnimate,
        "w-full bg-lime-500": !shouldAnimate,
      })}
      style={{
        animation: shouldAnimate
          ? `${clueDurationMs / 1000}s linear 0s 1 growFromLeft forwards,
             ${clueDurationMs / 1000}s linear 0s 1 turnGreen forwards`
          : "none",
      }}
    />
  );
}
