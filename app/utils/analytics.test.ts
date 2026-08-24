import type { BeforeSendEvent } from "@vercel/analytics/react";
import { describe, expect, it } from "vitest";

import { redactAnalyticsEvent } from "./analytics";

const ORIGIN = "https://example.com";
const EXAMPLE_ROOM_NAME = "1337-example";
const EXAMPLE_GAME_ID = "00000000-0000-4000-8000-000000000000";

function pageview(url: string): BeforeSendEvent {
  return { type: "pageview", url };
}

describe("redactAnalyticsEvent", () => {
  it.each([
    [`${ORIGIN}/room/${EXAMPLE_ROOM_NAME}`, `${ORIGIN}/room/redacted`],
    [`${ORIGIN}/ROOM/${EXAMPLE_ROOM_NAME}`, `${ORIGIN}/room/redacted`],
    [`${ORIGIN}/%72oom/${EXAMPLE_ROOM_NAME}`, `${ORIGIN}/room/redacted`],
    [
      `${ORIGIN}/room/${EXAMPLE_ROOM_NAME}/summary`,
      `${ORIGIN}/room/redacted/summary`,
    ],
    [`${ORIGIN}/game/${EXAMPLE_GAME_ID}/play`, `${ORIGIN}/game/redacted/play`],
    [`${ORIGIN}/GAME/${EXAMPLE_GAME_ID}/play`, `${ORIGIN}/game/redacted/play`],
    [`${ORIGIN}/game/${EXAMPLE_GAME_ID}/solo`, `${ORIGIN}/game/redacted/solo`],
  ])("redacts identifiers in %s", (url, expected) => {
    expect(redactAnalyticsEvent(pageview(url))).toEqual(pageview(expected));
  });

  it("removes query parameters and fragments", () => {
    expect(
      redactAnalyticsEvent(
        pageview(`${ORIGIN}/auth/callback?code=secret&utm_source=test#token`),
      ),
    ).toEqual(pageview(`${ORIGIN}/auth/callback`));
  });

  it("leaves static paths intact", () => {
    expect(redactAnalyticsEvent(pageview(`${ORIGIN}/howto`))).toEqual(
      pageview(`${ORIGIN}/howto`),
    );
  });

  it("does not throw on an unexpected URL", () => {
    const event = pageview("not a URL");

    expect(redactAnalyticsEvent(event)).toBe(event);
  });
});
