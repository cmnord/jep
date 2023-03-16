import classNames from "classnames";
import * as React from "react";

const NUM_BARS = 10;
const COUNTDOWN_TIME_SEC = 5;
const CENTER = (NUM_BARS - 1) / 2;

export function shouldShowTick(count: number, i: number) {
  const distFromCenter = Math.abs(CENTER - i);
  return distFromCenter < count;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Countdown displays 10 red bars which count down from the outside in once per
 * second for 5 seconds total. */
export function Countdown({ startTime }: { startTime?: number }) {
  const [count, setCount] = React.useState(NUM_BARS / 2);
  const animationRef = React.useRef<number>();

  React.useEffect(() => {
    const animate = (timeMs: number) => {
      const elapsedMs = Date.now() - timeMs;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const newCount = clamp(COUNTDOWN_TIME_SEC - elapsedSec, 0, NUM_BARS / 2);

      setCount(newCount);

      if (count <= NUM_BARS / 2) {
        animationRef.current = requestAnimationFrame(() => animate(timeMs));
      }
    };

    if (startTime) {
      animationRef.current = requestAnimationFrame(() => animate(startTime));
    }

    return () => cancelAnimationFrame(animationRef.current!);
  }, [count, startTime]);

  const bars = Array.from({ length: NUM_BARS }, (_, i) => (
    <div
      key={i}
      className={classNames("h-5", {
        "bg-red-600": startTime && shouldShowTick(count, i),
        "bg-gray-500": !startTime || !shouldShowTick(count, i),
      })}
      style={{ width: `${100 / NUM_BARS}%` }}
    />
  ));

  return <div className="flex justify-center gap-2 mt-2">{bars}</div>;
}
