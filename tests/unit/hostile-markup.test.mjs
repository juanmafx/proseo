import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditHtml, MAX_REPORTED_FINDINGS } from '../../src/audit/engine.mjs';
import { parseDocument } from '../../src/html/tree.mjs';
import { extractItems, flattenItems, MAX_EXTRACTED_VALUES } from '../../src/microdata/extract.mjs';
import { page } from '../helpers/fixtures.mjs';

const VALID_ITEM = '<div itemscope itemtype="https://schema.org/Thing"></div>';
const LIMIT = { timeout: 30000 };
const withBody = (markup) => page({ body: `<h1>Heading</h1>${VALID_ITEM}${markup}` });
const rulesFor = (html) => auditHtml(html).findings.map((finding) => finding.rule);
const withPolicy = (policy) => withBody('').replace("default-src 'none'", policy);

for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
  test(`stores the property name ${name} without touching prototypes`, () => {
    const [item] = extractItems(parseDocument(`<div itemscope><span itemprop="${name}">value</span></div>`));
    assert.ok(Object.hasOwn(item.properties, name));
    assert.deepEqual(item.properties[name], ['value']);
    assert.equal({}.polluted, undefined);
    assert.equal(Object.getPrototypeOf(item.properties), Object.prototype);
  });
}

test('collapses duplicate property tokens on one element', () => {
  const [item] = extractItems(parseDocument('<div itemscope><span itemprop="a a">x</span></div>'));
  assert.deepEqual(item.properties.a, ['x']);
});

test('bounds exponential expansion from multi-token nested properties', LIMIT, () => {
  const nested = `${'<div itemprop="a b" itemscope>'.repeat(30)}${'</div>'.repeat(30)}`;
  const html = withBody(`<div itemscope itemtype="https://schema.org/Thing">${nested}</div>`);
  assert.ok(rulesFor(html).includes('microdata-size'));
  assert.ok(flattenItems(extractItems(parseDocument(html))).length <= MAX_EXTRACTED_VALUES);
});

test('bounds quadratic text extraction from nested properties', LIMIT, () => {
  const html = `<div itemscope>${'<b itemprop="a">'.repeat(60000)}x${'</b>'.repeat(60000)}</div>`;
  assert.ok(rulesFor(html).includes('microdata-size'));
});

test('handles very wide elements without exceeding the call stack', LIMIT, () => {
  const [item] = extractItems(parseDocument(`<div itemscope><p>${'<b></b>'.repeat(200000)}</p></div>`));
  assert.equal(item.truncated, false);
});

test('checks deeply nested orphan properties in linear time', LIMIT, () => {
  const report = auditHtml(withBody('<b itemprop="a">'.repeat(100000)));
  assert.equal(report.findings.length, MAX_REPORTED_FINDINGS);
  assert.ok(report.errors >= 100000);
});

test('checks nested SVG anchors in linear time', LIMIT, () => {
  const report = auditHtml(withBody(`<svg>${'<a href="/x">'.repeat(100000)}`));
  assert.ok(report.warnings >= 100000);
});

test('caps reported findings and keeps exact totals', () => {
  const report = auditHtml(withBody('<img src="a.png">'.repeat(MAX_REPORTED_FINDINGS)));
  assert.equal(report.findings.length, MAX_REPORTED_FINDINGS);
  assert.equal(report.errors + report.warnings, MAX_REPORTED_FINDINGS * 2);
  assert.equal(report.omittedFindings, MAX_REPORTED_FINDINGS);
});

const FLAGGED = [
  ['inline-script', '<div><template shadowrootmode="open"><script>alert(1)</script></template></div>'],
  ['inline-handler', '<template><img src="a.png" alt="a" width="1" height="1" onerror="alert(1)"></template>'],
  ['iframe-srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ['unsafe-url-scheme', '<iframe src="data:image/svg+xml,<svg onload=alert(1)>"></iframe>'],
  ['unsafe-url-scheme', '<object data="data:application/xhtml+xml,x"></object>'],
  ['unsafe-url-scheme', '<script src="data:text/javascript,alert(1)"></script>'],
  ['unsafe-url-scheme', '<a href="data:image/svg+xml,x">x</a>'],
  ['unsafe-url-scheme', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
  ['unsafe-url-scheme', '<svg><a><animate attributeName="href" values="/x;javascript:alert(1)"></animate><text>x</text></a></svg>'],
  ['unsafe-url-scheme', '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>'],
  ['subresource-integrity', '<script src="\\\\example.test/a.js"></script>'],
  ['insecure-resource', '<object data="http://example.test/a"></object>'],
  ['insecure-resource', '<img src="a.png" alt="a" width="1" height="1" srcset="b.png 1x, http://example.test/c.png 2x">'],
  ['insecure-resource', '<video poster="http://example.test/a.png"></video>'],
];

FLAGGED.forEach(([rule, markup], index) => {
  test(`flags ${rule} in hostile markup (case ${index + 1})`, () => {
    assert.ok(rulesFor(withBody(markup)).includes(rule));
  });
});

for (const policy of ['', 'img-src *', 'default-src *', 'script-src https:', "default-src 'none'; script-src-elem *"]) {
  test(`flags a policy that does not restrict scripts: ${policy || '(empty)'}`, () => {
    assert.ok(rulesFor(withPolicy(policy)).includes('csp-script-policy'));
  });
}

test('flags unsafe-hashes in a policy', () => {
  assert.ok(rulesFor(withPolicy("script-src 'self' 'unsafe-hashes'")).includes('csp-unsafe'));
});

test('ignores a policy placed outside head', () => {
  const html = withBody(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'">`).replace(
    /<meta http-equiv="Content-Security-Policy" content="default-src 'none'">/,
    '',
  );
  assert.ok(rulesFor(html).includes('csp-present'));
});

const ACCEPTED = [
  ['title', '<svg><title>Icon</title></svg>'],
  ['link-text', '<a href="/x"><img src="a.png" alt="Logo" width="1" height="1"></a>'],
  ['link-text', '<a href="/x" title="Named"></a>'],
  ['link-target-rel', '<a href="/x" target="_blank" rel="noreferrer">x</a>'],
  ['microdata-orphan-property', '<div itemscope itemtype="https://schema.org/Thing" itemref="p"></div><div id="p"><span itemprop="name">x</span></div>'],
  ['unsafe-url-scheme', '<img src="data:image/svg+xml,x" alt="a" width="1" height="1">'],
];

ACCEPTED.forEach(([rule, markup], index) => {
  test(`does not raise ${rule} for valid markup (case ${index + 1})`, () => {
    assert.ok(!rulesFor(withBody(markup)).includes(rule));
  });
});

test('recognizes a canonical link with multiple rel tokens', () => {
  const html = withBody('').replace('rel="canonical"', 'rel="canonical nofollow"');
  assert.ok(!rulesFor(html).includes('canonical'));
});
