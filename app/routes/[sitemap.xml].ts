import { BASE_URL } from "~/utils";
import { INDEXABLE_PATHS } from "~/utils/seo";

export function loader() {
  const urls = INDEXABLE_PATHS.map(
    (pathname) =>
      `  <url><loc>${new URL(pathname, BASE_URL).toString()}</loc></url>`,
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
