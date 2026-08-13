import { describe, expect, it } from "vitest";

import { getPageMetadata, getSearchMetadata, INDEXABLE_PATHS } from "./seo";

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

  it("indexes a public game preview", () => {
    expect(getSearchMetadata("/game/example", BASE_URL, true)).toEqual({
      canonicalUrl: `${BASE_URL}/game/example`,
      robots: "index, follow",
    });
  });

  it("does not let the public-game flag index a nested game route", () => {
    expect(getSearchMetadata("/game/example/json", BASE_URL, true)).toEqual({
      canonicalUrl: undefined,
      robots: "noindex, follow",
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

describe("getPageMetadata", () => {
  it("returns unique search and social metadata for a page", () => {
    expect(getPageMetadata("Page title", "Page description")).toEqual([
      { title: "Page title" },
      { name: "description", content: "Page description" },
      { property: "og:title", content: "Page title" },
      { property: "og:description", content: "Page description" },
      { property: "twitter:title", content: "Page title" },
      { property: "twitter:description", content: "Page description" },
    ]);
  });
});
