import * as React from "react";

/** Grace period before showing the offline banner, so it doesn't flash during
 * normal page loads where connectivity is briefly indeterminate. */
const OFFLINE_DELAY_MS = 2000;

export default function OfflineIndicator() {
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function scheduleShow() {
      clearTimeout(timer);
      timer = setTimeout(() => setShowBanner(true), OFFLINE_DELAY_MS);
    }

    function hide() {
      clearTimeout(timer);
      setShowBanner(false);
    }

    if (!navigator.onLine) {
      scheduleShow();
    }

    window.addEventListener("online", hide);
    window.addEventListener("offline", scheduleShow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", hide);
      window.removeEventListener("offline", scheduleShow);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="mb-4 rounded-md bg-yellow-600 px-3 py-1.5 text-center text-sm text-white">
      You are offline. Playing from cached data.
    </div>
  );
}
