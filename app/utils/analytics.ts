import type { BeforeSendEvent } from "@vercel/analytics/react";
import { href } from "react-router";

const DYNAMIC_PATHS = [
  {
    pattern: /^\/room\/[^/]+(?=\/|$)/i,
    replacement: href("/room/:roomName", { roomName: "redacted" }),
  },
  {
    pattern: /^\/game\/[^/]+(?=\/|$)/i,
    replacement: href("/game/:gameId", { gameId: "redacted" }),
  },
] as const;

/**
 * Remove identifiers and query data before an analytics event leaves the app.
 * This keeps aggregate route reporting useful without recording room codes,
 * game IDs, auth parameters, or other user-provided query values.
 */
export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  try {
    const url = new URL(event.url);
    let pathname = url.pathname;

    try {
      // React Router accepts percent-encoded route names while URL preserves
      // their spelling. decodeURI normalizes letters without decoding reserved
      // path separators that may occur inside a dynamic segment.
      pathname = decodeURI(pathname);
    } catch {
      // Keep processing query and fragment data if the path is malformed.
    }

    for (const { pattern, replacement } of DYNAMIC_PATHS) {
      pathname = pathname.replace(pattern, replacement);
    }

    url.pathname = pathname;
    url.search = "";
    url.hash = "";

    return { ...event, url: url.toString() };
  } catch {
    // Do not break analytics script execution if it supplies an unexpected URL.
    return event;
  }
}
