import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditHtml } from '../../src/audit/engine.mjs';
import { getAttribute, listElements, parseDocument } from '../../src/html/tree.mjs';
import { extractItems, flattenItems } from '../../src/microdata/extract.mjs';
import { renderPage } from '../../src/render/page.mjs';
import { renderSitemap } from '../../src/render/sitemap.mjs';
import { validCatalog } from '../helpers/fixtures.mjs';

const PAYLOAD = '"><script>alert(1)</script><img src=x onerror=alert(1)>';

test('renders a page with no audit errors or warnings', () => {
  const report = auditHtml(renderPage(validCatalog()));
  assert.deepEqual(report.findings, []);
});

test('neutralizes markup injected through catalog text', () => {
  const catalog = validCatalog();
  Object.assign(catalog.products[0], { name: PAYLOAD, description: PAYLOAD, brand: PAYLOAD, category: PAYLOAD, imageAlt: PAYLOAD });
  catalog.site.tagline = PAYLOAD;
  const elements = listElements(parseDocument(renderPage(catalog)));
  assert.equal(elements.filter((element) => element.tagName === 'script').length, 0);
  assert.equal(elements.filter((element) => getAttribute(element, 'onerror') !== undefined).length, 0);
});

test('preserves injected text as a literal microdata value', () => {
  const catalog = validCatalog();
  catalog.products[0].name = PAYLOAD;
  const items = flattenItems(extractItems(parseDocument(renderPage(catalog))));
  const product = items.find((item) => item.types.includes('https://schema.org/Product'));
  assert.deepEqual(product.properties.name, [PAYLOAD]);
});

test('nests WebPage, ItemList, Product, and Brand', () => {
  const [webPage] = extractItems(parseDocument(renderPage(validCatalog())));
  const [list] = webPage.properties.mainEntity;
  const [product] = list.properties.itemListElement;
  const [brand] = product.properties.brand;
  assert.deepEqual(webPage.types, ['https://schema.org/WebPage']);
  assert.deepEqual(list.types, ['https://schema.org/ItemList']);
  assert.deepEqual(product.types, ['https://schema.org/Product']);
  assert.deepEqual(brand.properties.name, ['Sample Brand']);
});

test('omits commercial claims from the markup', () => {
  const html = renderPage(validCatalog());
  for (const property of ['offers', 'price', 'aggregateRating', 'review', 'availability']) {
    assert.ok(!html.includes(`itemprop="${property}"`), property);
  }
});

test('states the project history', () => {
  assert.match(renderPage(validCatalog()), /Originally created in 2016, modernized in 2026\./);
});

test('escapes sitemap URLs', () => {
  const catalog = validCatalog();
  catalog.site.canonicalUrl = 'https://example.test/?a=1&b=2';
  assert.match(renderSitemap(catalog), /<loc>https:\/\/example\.test\/\?a=1&amp;b=2<\/loc>/);
});
