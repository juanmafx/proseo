import { escapeHtml } from '../html/escape.mjs';

export function renderSitemap({ site }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(site.canonicalUrl)}</loc>
  </url>
</urlset>
`;
}
