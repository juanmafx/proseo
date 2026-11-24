import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditHtml } from '../../src/audit/engine.mjs';
import { getAttribute, listElements, parseDocument } from '../../src/html/tree.mjs';
import { renderArtifacts } from '../../src/render/site.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const elements = listElements(parseDocument(html));

test('committed artifacts match the renderer', async () => {
  for (const [name, content] of await renderArtifacts(root)) {
    assert.equal(readFileSync(join(root, name), 'utf8'), content, name);
  }
});

test('published page has no audit findings', () => {
  assert.deepEqual(auditHtml(html).findings, []);
});

test('every local asset exists', () => {
  const urls = elements.flatMap((element) => {
    if (element.tagName === 'img') return [getAttribute(element, 'src')];
    if (element.tagName === 'link' && getAttribute(element, 'rel') === 'stylesheet') return [getAttribute(element, 'href')];
    return [];
  });
  assert.ok(urls.length >= 3);
  for (const url of urls) {
    assert.ok(existsSync(join(root, url)), url);
  }
});

test('every in-page anchor resolves', () => {
  const ids = new Set(elements.map((element) => getAttribute(element, 'id')).filter(Boolean));
  const anchors = elements.map((element) => getAttribute(element, 'href')).filter((href) => href?.startsWith('#'));
  assert.ok(anchors.length > 0);
  for (const anchor of anchors) {
    assert.ok(ids.has(anchor.slice(1)), anchor);
  }
});

test('page loads no scripts and no third-party resources', () => {
  assert.equal(elements.filter((element) => element.tagName === 'script').length, 0);
  const external = elements.filter((element) => ['img', 'iframe', 'source'].includes(element.tagName) && /^(https?:)?\/\//.test(getAttribute(element, 'src') ?? ''));
  const stylesheets = elements.filter((element) => element.tagName === 'link' && getAttribute(element, 'rel') === 'stylesheet' && /^(https?:)?\/\//.test(getAttribute(element, 'href')));
  assert.deepEqual([...external, ...stylesheets], []);
});

test('stylesheet makes no external requests', () => {
  const css = readFileSync(join(root, 'assets', 'css', 'site.css'), 'utf8');
  assert.doesNotMatch(css, /url\(|@import/);
});

test('Content-Security-Policy is the first directive after charset', () => {
  const head = elements.filter((element) => element.parentNode?.tagName === 'head');
  assert.equal(getAttribute(head[1], 'http-equiv'), 'Content-Security-Policy');
});
