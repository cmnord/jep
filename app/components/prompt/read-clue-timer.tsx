import classNames from "classnames";

/** ReadClueTimer is a white bar which scrolls across the screen for
 * clueDurationMs. */
export function ReadClueTimer({
  clueDurationMs,
  shouldAnimate,
  wonBuzz,
}: {
  clueDurationMs: number;
  shouldAnimate: boolean;
  wonBuzz: boolean;
}) {
  return (
    <div
      className={classNames("h-8 mt-2 self-start", {
        "w-0 bg-white": shouldAnimate,
        "w-full": !shouldAnimate,
        "bg-red-600 opacity-75": !shouldAnimate && !wonBuzz,
        "bg-lime-500": !shouldAnimate && wonBuzz,
      })}
      style={{
        animation: shouldAnimate
          ? `${clueDurationMs / 1000}s linear 0s 1 growFromLeft forwards,
             ${clueDurationMs / 1000}s linear 0s 1 turnGreen forwards,
             5s linear ${clueDurationMs / 1000}s 1 shrinkToLeft forwards`
          : "none",
      }}
    />
  );
}
