import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CatalogError, validateCatalog } from '../../src/catalog/validate.mjs';
import { validCatalog } from '../helpers/fixtures.mjs';

function issuesFor(mutate) {
  const catalog = validCatalog();
  mutate(catalog);
  try {
    validateCatalog(catalog);
  } catch (error) {
    assert.ok(error instanceof CatalogError);
    return error.issues.join('\n');
  }
  return '';
}

test('accepts a valid catalog', () => {
  assert.equal(issuesFor(() => {}), '');
});

test('rejects non-object catalogs', () => {
  assert.throws(() => validateCatalog(null), CatalogError);
});

test('rejects an empty product list', () => {
  assert.match(issuesFor((catalog) => { catalog.products = []; }), /non-empty/);
});

test('rejects a missing site', () => {
  assert.match(issuesFor((catalog) => { catalog.site = null; }), /site must be an object/);
});

for (const image of ['../secret.svg', '/etc/passwd', 'https://example.test/a.svg', 'assets/images/a.svg?x=1', 'assets/images/../a.svg']) {
  test(`rejects unsafe image path ${image}`, () => {
    assert.match(issuesFor((catalog) => { catalog.products[0].image = image; }), /image must be/);
  });
}

for (const url of ['http://example.test/', 'javascript:alert(1)', 'not a url', 'https://user:pass@example.test/']) {
  test(`rejects canonical URL ${url}`, () => {
    assert.match(issuesFor((catalog) => { catalog.site.canonicalUrl = url; }), /canonicalUrl/);
  });
}

test('rejects duplicate product ids', () => {
  assert.match(issuesFor((catalog) => { catalog.products.push({ ...catalog.products[0] }); }), /duplicated/);
});

test('rejects ids that are not slugs', () => {
  assert.match(issuesFor((catalog) => { catalog.products[0].id = 'Bad Id"'; }), /slug/);
});

test('rejects control characters in text', () => {
  assert.match(issuesFor((catalog) => { catalog.products[0].name = 'bad\u0000name'; }), /control characters/);
});

test('rejects out-of-range title lengths', () => {
  assert.match(issuesFor((catalog) => { catalog.site.title = 'Short'; }), /site\.title/);
});

test('rejects invalid image dimensions', () => {
  assert.match(issuesFor((catalog) => { catalog.products[0].imageWidth = 0; }), /imageWidth/);
});

test('rejects a modernization year before creation', () => {
  assert.match(issuesFor((catalog) => { catalog.site.modernizedYear = 2000; }), /modernizedYear/);
});
