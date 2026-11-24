import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditHtml } from '../../src/audit/engine.mjs';
import { page } from '../helpers/fixtures.mjs';

const VALID_ITEM = '<div itemscope itemtype="https://schema.org/Thing"></div>';
const rulesFor = (html) => auditHtml(html).findings.map((finding) => finding.rule);
const withBody = (markup) => page({ body: `<h1>Heading</h1>${VALID_ITEM}${markup}` });

function assertFlags(rule, html) {
  assert.ok(rulesFor(html).includes(rule), `expected ${rule}, got ${rulesFor(html).join(', ')}`);
}

test('passes a clean page', () => {
  assert.deepEqual(auditHtml(withBody('')).findings, []);
});

const CASES = [
  ['html-lang', page({ lang: '', body: `<h1>Heading</h1>${VALID_ITEM}` })],
  ['title', page({ head: '<title>Second title for this document</title>' })],
  ['meta-description', page({ head: '<meta name="description" content="duplicate">' })],
  ['canonical', page({ head: '<link rel="canonical" href="https://example.test/two">' })],
  ['single-h1', withBody('<h1>Second</h1>')],
  ['heading-order', withBody('<h4>Skipped</h4>')],
  ['img-alt', withBody('<img src="a.png" width="1" height="1">')],
  ['img-dimensions', withBody('<img src="a.png" alt="a">')],
  ['unsafe-url-scheme', withBody('<a href="javascript:alert(1)">x</a>')],
  ['unsafe-url-scheme', withBody('<a href=" JaVa\nScRiPt:alert(1)">x</a>')],
  ['unsafe-url-scheme', withBody('<iframe src="data:text/html,x"></iframe>')],
  ['unsafe-url-scheme', withBody('<form action="vbscript:x"></form>')],
  ['link-target-rel', withBody('<a href="/x" target="_blank">x</a>')],
  ['link-text', withBody('<a href="/x"></a>')],
  ['inline-handler', withBody('<div onclick="x()"></div>')],
  ['inline-script', withBody('<script>alert(1)</script>')],
  ['insecure-resource', withBody('<img src="http://example.test/a.png" alt="a" width="1" height="1">')],
  ['insecure-resource', page({ head: '<link rel="stylesheet" href="http://example.test/a.css">' })],
  ['subresource-integrity', withBody('<script src="https://example.test/a.js"></script>')],
  ['subresource-integrity', page({ head: '<link rel="stylesheet" href="//example.test/a.css">' })],
  ['microdata-present', page()],
  ['microdata-orphan-property', withBody('<span itemprop="name">x</span>')],
  ['microdata-itemref', withBody('<div itemscope itemtype="https://schema.org/Thing" itemref="a"></div>')],
  ['microdata-itemtype', withBody('<div itemscope></div>')],
  ['microdata-itemtype', withBody('<div itemscope itemtype="Product"></div>')],
  ['microdata-itemtype-https', withBody('<div itemscope itemtype="http://schema.org/Thing"></div>')],
  ['product-name', withBody('<div itemscope itemtype="https://schema.org/Product"></div>')],
  ['product-recommended', withBody('<div itemscope itemtype="https://schema.org/Product"><i itemprop="name">x</i></div>')],
];

CASES.forEach(([rule, html], index) => {
  test(`flags ${rule} (case ${index + 1})`, () => assertFlags(rule, html));
});

test('flags a missing Content-Security-Policy', () => {
  assertFlags('csp-present', withBody('').replace(/<meta http-equiv[^>]*>/, ''));
});

test('flags an unsafe Content-Security-Policy', () => {
  assertFlags('csp-unsafe', withBody('').replace("default-src 'none'", "script-src 'unsafe-inline'"));
});

test('flags missing title, description, and canonical', () => {
  const rules = rulesFor('<!doctype html><html lang="en"><head></head><body></body></html>');
  for (const rule of ['title', 'meta-description', 'canonical', 'viewport', 'single-h1']) {
    assert.ok(rules.includes(rule), rule);
  }
});

test('flags out-of-range title and description lengths', () => {
  const html = withBody('').replace('A sufficiently long page title for tests', 'Short').replace(/content="A sufficiently[^"]*"/, 'content="Short"');
  assertFlags('title-length', html);
  assertFlags('meta-description-length', html);
});

test('flags an insecure canonical URL', () => {
  assertFlags('canonical', withBody('').replace('https://example.test/', 'http://example.test/'));
});

test('flags items nested beyond the depth limit', () => {
  const nested = `${'<div itemprop="n" itemscope itemtype="https://schema.org/Thing">'.repeat(40)}${'</div>'.repeat(40)}`;
  assertFlags('microdata-depth', withBody(`<div itemscope itemtype="https://schema.org/Thing">${nested}</div>`));
});

test('allows JSON-LD data blocks', () => {
  assert.ok(!rulesFor(withBody('<script type="application/ld+json">{}</script>')).includes('inline-script'));
});

test('allows external scripts with integrity', () => {
  const html = withBody('<script src="https://example.test/a.js" integrity="sha384-x"></script>');
  assert.ok(!rulesFor(html).includes('subresource-integrity'));
});

test('counts errors and warnings separately', () => {
  const report = auditHtml(withBody('<img src="a.png">'));
  assert.equal(report.errors, 1);
  assert.equal(report.warnings, 1);
});

test('reports source line numbers', () => {
  const report = auditHtml(withBody('\n\n<img src="a.png" width="1" height="1">'));
  const finding = report.findings.find((item) => item.rule === 'img-alt');
  assert.ok(finding.line > 1);
});

test('audits deeply nested markup without overflowing the stack', () => {
  const html = withBody(`${'<div>'.repeat(20000)}${'</div>'.repeat(20000)}`);
  assert.equal(auditHtml(html).errors, 0);
});
