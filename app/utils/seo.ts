import { href, matchPath } from "react-router";

// href() checks these paths against React Router's generated route types, so a
// renamed or removed public route fails typechecking instead of going stale.
export const INDEXABLE_PATHS = [
  href("/"),
  href("/about"),
  href("/howto"),
  href("/upload-help"),
  href("/community"),
] as const;

export const INDEX_DIRECTIVES = "index, follow";
export const NO_INDEX_DIRECTIVES = "noindex, follow";
export const SITE_DESCRIPTION =
  "A website for sharing J! trivia and playing collaboratively with friends in real time.";

export function getPageMetadata(title: string, description: string) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "twitter:title", content: title },
    { property: "twitter:description", content: description },
  ];
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function getSearchMetadata(
  pathname: string,
  baseUrl: string,
  publicGamePreview = false,
) {
  const normalizedPathname = normalizePathname(pathname);
  const indexable =
    INDEXABLE_PATHS.some((publicPath) => publicPath === normalizedPathname) ||
    (publicGamePreview &&
      matchPath("/game/:gameId", normalizedPathname) !== null);

  return {
    canonicalUrl: indexable
      ? new URL(normalizedPathname, baseUrl).toString()
      : undefined,
    robots: indexable ? INDEX_DIRECTIVES : NO_INDEX_DIRECTIVES,
  };
}
