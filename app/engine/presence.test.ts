import { describe, expect, it } from "vitest";

import { countWatchers, listWatchers } from "./presence";

describe("countWatchers", () => {
  it("is 0 for an empty channel", () => {
    expect(countWatchers({})).toBe(0);
  });

  it("counts spectators only (not players or presenter screens)", () => {
    expect(
      countWatchers({
        a: [{ role: "spectator" }],
        b: [{ role: "player" }],
        c: [{ role: "presenter" }],
        d: [{ role: "spectator" }],
        e: [{}],
      }),
    ).toBe(2);
  });

  it("uses the latest role of a key", () => {
    expect(
      countWatchers({ a: [{ role: "spectator" }, { role: "player" }] }),
    ).toBe(0);
    expect(
      countWatchers({ a: [{ role: "player" }, { role: "spectator" }] }),
    ).toBe(1);
  });
});

describe("listWatchers", () => {
  it("lists spectators who said who they are, once per user", () => {
    expect(
      listWatchers({
        a: [{ role: "spectator", userId: "u2", name: "Zed" }],
        b: [{ role: "player", userId: "u3", name: "Player" }],
        c: [{ role: "presenter" }],
        d: [{ role: "spectator", userId: "u1", name: "Ann" }],
        e: [{ role: "spectator", userId: "u1", name: "Ann" }],
        f: [{ role: "spectator" }],
        g: [{ role: "spectator", userId: 5, name: "Bad" }],
      }),
    ).toEqual([
      { userId: "u1", name: "Ann" },
      { userId: "u2", name: "Zed" },
    ]);
  });
});
