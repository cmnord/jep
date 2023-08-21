import * as React from "react";

/** useScrollToBottom fires a callback when the current scroll height is within
 * thresholdPx of the bottom of the page.
 */
export default function useScrollToBottom(
  callback: () => void,
  thresholdPx = 50,
) {
  const [isNearBottom, setIsNearBottom] = React.useState(false);

  const handleScroll = React.useCallback(() => {
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    const atBottom = scrollTop + clientHeight >= scrollHeight - thresholdPx;
    setIsNearBottom(atBottom);
  }, [thresholdPx]);

  React.useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  React.useEffect(() => {
    if (isNearBottom) {
      callback();
    }
  }, [isNearBottom, callback]);

  return isNearBottom;
}
