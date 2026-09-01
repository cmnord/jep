import { ENV } from "varlock/env";

import { getPublicGameSitemapEntries } from "~/models/game.server";
import { INDEXABLE_PATHS } from "~/utils/seo";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// This is a resource route that returns XML, rather than an HTML document, so
// serialize the small sitemap directly instead of rendering a React tree.
function createSitemap(urls: URL[]) {
  const entries = urls
    .map((url) => `  <url><loc>${escapeXml(url.toString())}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export async function loader() {
  let publicGames: Awaited<ReturnType<typeof getPublicGameSitemapEntries>> = [];
  try {
    publicGames = await getPublicGameSitemapEntries();
  } catch (error) {
    // Keep the static sitemap available during a transient database failure.
    console.error("Could not add public games to sitemap", error);
  }
  const urls = [
    ...INDEXABLE_PATHS.map((pathname) => new URL(pathname, ENV.BASE_URL)),
    ...publicGames.map(
      (game) => new URL(`/game/${encodeURIComponent(game.id)}`, ENV.BASE_URL),
    ),
  ];

  return new Response(createSitemap(urls), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
