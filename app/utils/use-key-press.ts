import * as React from "react";

/** useKeyPress listens for a key press and calls `callback` when it is pressed.
 *
 * Thank you ChatGPT
 */
export function useKeyPress(
  targetKey: KeyboardEvent["key"],
  callback: () => void
) {
  React.useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      if (event.key === targetKey) {
        callback();
      }
    }

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [targetKey, callback]);
}

export default useKeyPress;
