import { describe, expect, it } from "vitest";

import type { DbRoomEvent } from "~/models/room-event.server";

import { ActionType } from "./engine";
import { mergeRoomEvents } from "./room-event";

function event(id: number, ts: string, type: string = ActionType.Join) {
  return {
    id,
    room_id: 1,
    ts,
    type,
    payload: { userId: `u${id}`, name: `Player ${id}` },
  } satisfies DbRoomEvent;
}

const E1 = event(1, "2026-10-25T10:00:01");
const E2 = event(2, "2026-10-25T10:00:02");
const E3 = event(3, "2026-10-25T10:00:03");
const E4 = event(4, "2026-10-25T10:00:04");

describe("mergeRoomEvents", () => {
  it("appends events newer than everything known", () => {
    const result = mergeRoomEvents([E1, E2], [E3, E4]);
    expect(result.added.map((e) => e.id)).toEqual([3, 4]);
    expect(result.appendOnly).toBe(true);
    expect(result.events.map((e) => e.id)).toEqual([1, 2, 3, 4]);
  });

  it("drops events that were already seen (dedupe by id)", () => {
    const result = mergeRoomEvents([E1, E2], [E2, E1, E3, E3]);
    expect(result.added.map((e) => e.id)).toEqual([3]);
    expect(result.events.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("returns nothing added for a full snapshot of known events", () => {
    const result = mergeRoomEvents([E1, E2, E3], [E1, E2, E3]);
    expect(result.added).toEqual([]);
    expect(result.appendOnly).toBe(true);
    expect(result.events.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("sorts incoming events by ts then id", () => {
    const result = mergeRoomEvents([E1], [E4, E3, E2]);
    expect(result.added.map((e) => e.id)).toEqual([2, 3, 4]);
    expect(result.appendOnly).toBe(true);
  });

  it("flags a late event that belongs before already-applied events", () => {
    const result = mergeRoomEvents([E1, E3], [E2, E3, E4]);
    expect(result.added.map((e) => e.id)).toEqual([2, 4]);
    expect(result.appendOnly).toBe(false);
    expect(result.events.map((e) => e.id)).toEqual([1, 2, 3, 4]);
  });

  it("ignores events with an unknown type", () => {
    const result = mergeRoomEvents([E1], [event(2, E2.ts, "not_a_type")]);
    expect(result.added).toEqual([]);
    expect(result.events.map((e) => e.id)).toEqual([1]);
  });

  it("orders events with equal ts by id", () => {
    const a = event(5, "2026-10-25T10:00:05");
    const b = event(6, "2026-10-25T10:00:05");
    expect(mergeRoomEvents([b], [a]).appendOnly).toBe(false);
    expect(mergeRoomEvents([a], [b]).appendOnly).toBe(true);
  });
});
