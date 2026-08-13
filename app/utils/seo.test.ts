import { describe, expect, it } from "vitest";

import { getSearchMetadata, INDEXABLE_PATHS } from "./seo";

const BASE_URL = "https://whatis.club";

describe("getSearchMetadata", () => {
  it.each(INDEXABLE_PATHS)("indexes public page %s", (pathname) => {
    expect(getSearchMetadata(pathname, BASE_URL)).toEqual({
      canonicalUrl: new URL(pathname, BASE_URL).toString(),
      robots: "index, follow",
    });
  });

  it("normalizes a trailing slash in public canonical URLs", () => {
    expect(getSearchMetadata("/howto/", BASE_URL)).toEqual({
      canonicalUrl: `${BASE_URL}/howto`,
      robots: "index, follow",
    });
  });

  it.each([
    "/room/33394-dimp",
    "/room/33394-dimp/summary",
    "/profile",
    "/settings",
    "/login",
    "/game/example",
    "/mock",
  ])("keeps private and utility page %s out of search", (pathname) => {
    expect(getSearchMetadata(pathname, BASE_URL)).toEqual({
      canonicalUrl: undefined,
      robots: "noindex, follow",
    });
  });
});
