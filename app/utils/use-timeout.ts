import * as React from "react";

/** useTimeout calls callback after delayMs, if provided. */
export default function useTimeout(
  callback: () => void,
  delayMs: number | null,
) {
  const savedCallback = React.useRef<typeof callback>(() => null);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };
    if (delayMs !== null) {
      const timerId = setTimeout(tick, delayMs);
      return () => clearTimeout(timerId);
    }
  }, [delayMs]);
}
