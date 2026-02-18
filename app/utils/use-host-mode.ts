import { useSearchParams } from "react-router";

export function useIsHostMode() {
  const [searchParams] = useSearchParams();
  return searchParams.get("mode") === "host";
}
