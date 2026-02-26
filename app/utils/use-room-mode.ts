import { useSearchParams } from "react-router";

/** Returns true if this device is the host (`?mode=host` in the URL). */
export function useIsHost() {
  const [searchParams] = useSearchParams();
  return searchParams.get("mode") === "host";
}

/** Returns true if this device is a spectator (`?mode=spectator` in the URL). */
export function useIsSpectator() {
  const [searchParams] = useSearchParams();
  return searchParams.get("mode") === "spectator";
}
