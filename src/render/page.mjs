import { escapeHtml as e } from '../html/escape.mjs';
import { renderProduct } from './product.mjs';

export const CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests";

export function renderPage({ site, products }) {
  const productMarkup = products.map(renderProduct).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${e(CONTENT_SECURITY_POLICY)}">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${e(site.title)}</title>
    <meta name="description" content="${e(site.description)}">
    <meta name="robots" content="index, follow">
    <meta name="color-scheme" content="light dark">
    <link rel="canonical" href="${e(site.canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${e(site.name)}">
    <meta property="og:title" content="${e(site.title)}">
    <meta property="og:description" content="${e(site.description)}">
    <meta property="og:url" content="${e(site.canonicalUrl)}">
    <link rel="stylesheet" href="assets/css/site.css">
  </head>
  <body itemscope itemtype="https://schema.org/WebPage">
    <link itemprop="url" href="${e(site.canonicalUrl)}">
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="masthead">
      <div class="shell">
        <p class="masthead__eyebrow">Structured data reference</p>
        <h1 itemprop="name">${e(site.name)}</h1>
        <p class="masthead__tagline" itemprop="description">${e(site.tagline)}</p>
        <nav aria-label="Primary">
          <ul class="nav">
            <li><a href="#products">Sample catalog</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="${e(site.repositoryUrl)}">Source code</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main id="content" class="shell">
      <section id="products" aria-labelledby="products-title" itemprop="mainEntity" itemscope itemtype="https://schema.org/ItemList">
        <h2 id="products-title" itemprop="name">Sample catalog</h2>
        <meta itemprop="numberOfItems" content="${products.length}">
        <p class="notice">These entries are sample data. Nothing is sold here, so the markup deliberately omits prices, ratings, and availability.</p>
        <div class="product-grid">
${productMarkup}
        </div>
      </section>
      <section id="about" aria-labelledby="about-title">
        <h2 id="about-title">About this page</h2>
        <p>This page is generated from a validated JSON catalog. Every value is escaped at render time, and the same repository ships an auditor that checks the published HTML for SEO metadata, microdata integrity, and a security baseline.</p>
        <ul class="checklist">
          <li>Nested schema.org microdata: WebPage, ItemList, Product, and Brand</li>
          <li>Canonical URL, description, and Open Graph metadata</li>
          <li>No JavaScript, no third-party requests, and a restrictive Content Security Policy</li>
        </ul>
      </section>
    </main>
    <footer class="site-footer">
      <div class="shell">
        <p>Originally created in ${site.createdYear}, modernized in ${site.modernizedYear}.</p>
        <p>Product and brand names belong to their respective owners. This project is not affiliated with them.</p>
      </div>
    </footer>
  </body>
</html>
`;
}
