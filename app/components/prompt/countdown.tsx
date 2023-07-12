import classNames from "classnames";
import * as React from "react";

const DEFAULT_COUNTDOWN_SEC = 5;

export function shouldShowTick(count: number, i: number, center: number) {
  const distFromCenter = Math.abs(center - i);
  return distFromCenter < count;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Countdown displays 10 red bars which count down from the outside in once per
 * second for 5 seconds total. */
export function Countdown({
  startTime,
  durationSec = DEFAULT_COUNTDOWN_SEC,
}: {
  startTime?: number;
  durationSec?: number;
}) {
  const numBars = durationSec * 2 - 1;
  const center = (numBars - 1) / 2;

  const [count, setCount] = React.useState(numBars / 2);
  const animationRef = React.useRef<number>();

  React.useEffect(() => {
    const animate = (timeMs: number) => {
      const elapsedMs = Date.now() - timeMs;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const newCount = clamp(durationSec - elapsedSec, 0, numBars / 2);

      setCount(newCount);

      if (count <= numBars / 2) {
        animationRef.current = requestAnimationFrame(() => animate(timeMs));
      }
    };

    if (startTime) {
      animationRef.current = requestAnimationFrame(() => animate(startTime));
    }

    return () => cancelAnimationFrame(animationRef.current!);
  }, [count, startTime, durationSec, numBars]);

  const bars = Array.from({ length: numBars }, (_, i) => (
    <div
      key={i}
      className={classNames("h-5", {
        "bg-red-600": startTime && shouldShowTick(count, i, center),
        "bg-slate-500": !startTime || !shouldShowTick(count, i, center),
      })}
      style={{ width: `${100 / numBars}%` }}
    />
  ));

  return (
    <div
      className={classNames("mt-2 flex justify-center", {
        "gap-2": numBars < 10,
        "gap-1": numBars >= 10,
      })}
    >
      {bars}
    </div>
  );
}
