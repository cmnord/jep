import { href } from "react-router";

import { BASE_URL } from "~/utils";

export function loader() {
  // Crawlers need access to every route in order to see its noindex directive.
  const sitemapUrl = new URL(href("/sitemap.xml"), BASE_URL).toString();
  const body = `User-agent: *
Allow: /
Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
