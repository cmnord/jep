import classNames from "classnames";

export default function ReadClueTimer({
  clueDurationMs,
  shouldAnimate,
}: {
  clueDurationMs: number;
  shouldAnimate: boolean;
}) {
  return (
    <div
      className={classNames("h-8 bg-white self-start", {
        "w-0": shouldAnimate,
        "w-full": !shouldAnimate,
      })}
      style={{
        animation: shouldAnimate
          ? `${clueDurationMs / 1000}s linear 0s 1 growFromLeft forwards`
          : "none",
      }}
    />
  );
}
