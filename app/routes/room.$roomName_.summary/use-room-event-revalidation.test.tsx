import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { useRoomEventRevalidation } from "./use-room-event-revalidation";

const mocks = vi.hoisted(() => {
  let roomEventHandler = () => {};
  let statusHandler: (status: string) => void = () => {};
  const revalidate = vi.fn();
  const channel = {
    on: vi.fn((_event: string, _filter: unknown, handler: () => void) => {
      roomEventHandler = handler;
      return channel;
    }),
    subscribe: vi.fn((handler: (status: string) => void) => {
      statusHandler = handler;
      return channel;
    }),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };

  return {
    channel,
    client,
    revalidate,
    triggerRoomEvent: () => roomEventHandler(),
    triggerStatus: (status: string) => statusHandler(status),
  };
});

vi.mock("react-router", () => ({
  useRevalidator: () => ({ revalidate: mocks.revalidate }),
}));

vi.mock("~/supabase", () => ({
  getSupabase: () => mocks.client,
}));

function TestHook() {
  useRoomEventRevalidation(42);
  return null;
}

describe("useRoomEventRevalidation", () => {
  it("revalidates after subscribing and whenever a room event arrives", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => root.render(<TestHook />));

    expect(mocks.client.channel).toHaveBeenCalledWith("summary:roomId:42");
    expect(mocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_events",
        filter: "room_id=eq.42",
      },
      expect.any(Function),
    );

    act(() => mocks.triggerStatus("CHANNEL_ERROR"));
    expect(mocks.revalidate).not.toHaveBeenCalled();

    act(() => mocks.triggerStatus("SUBSCRIBED"));
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);

    act(() => mocks.triggerRoomEvent());
    expect(mocks.revalidate).toHaveBeenCalledTimes(2);

    act(() => root.unmount());
    expect(mocks.client.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});
