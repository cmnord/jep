import { href } from "react-router";

// href() checks these paths against React Router's generated route types, so a
// renamed or removed public route fails typechecking instead of going stale.
export const INDEXABLE_PATHS = [
  href("/"),
  href("/howto"),
  href("/help"),
  href("/community"),
] as const;

export const INDEX_DIRECTIVES = "index, follow";
export const NO_INDEX_DIRECTIVES = "noindex, follow";

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function getSearchMetadata(pathname: string, baseUrl: string) {
  const normalizedPathname = normalizePathname(pathname);
  const indexable = INDEXABLE_PATHS.some(
    (publicPath) => publicPath === normalizedPathname,
  );

  return {
    canonicalUrl: indexable
      ? new URL(normalizedPathname, baseUrl).toString()
      : undefined,
    robots: indexable ? INDEX_DIRECTIVES : NO_INDEX_DIRECTIVES,
  };
}
