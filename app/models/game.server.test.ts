import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}));

vi.mock("~/supabase", () => ({
  getSupabase,
}));

vi.mock("~/supabase/admin.server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getPublicGameSitemapEntries } from "./game.server";

describe("getPublicGameSitemapEntries", () => {
  beforeEach(() => {
    getSupabase.mockReset();
  });

  it("fetches public games until the database returns a short page", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `game-${index}`,
    }));
    const secondPage = [{ id: "game-1000" }, { id: "game-1001" }];
    const range = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range,
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(getPublicGameSitemapEntries()).resolves.toEqual([
      ...firstPage,
      ...secondPage,
    ]);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
