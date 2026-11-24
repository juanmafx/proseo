import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDocument } from '../../src/html/tree.mjs';
import { extractItems, flattenItems, MAX_ITEM_DEPTH } from '../../src/microdata/extract.mjs';

const extract = (html) => extractItems(parseDocument(html));

test('reads values from element-specific attributes', () => {
  const [item] = extract(`<div itemscope itemtype="https://schema.org/Thing">
    <meta itemprop="a" content="meta"><img itemprop="b" src="i.png"><a itemprop="c" href="/l">t</a>
    <time itemprop="d" datetime="2026-01-01">Jan</time><data itemprop="e" value="7">seven</data><span itemprop="f"> plain  text </span>
  </div>`);
  assert.deepEqual(item.properties, { a: ['meta'], b: ['i.png'], c: ['/l'], d: ['2026-01-01'], e: ['7'], f: ['plain text'] });
});

test('assigns multiple property names from one element', () => {
  const [item] = extract('<div itemscope><span itemprop="a b">x</span></div>');
  assert.deepEqual(item.properties, { a: ['x'], b: ['x'] });
});

test('collects repeated properties in document order', () => {
  const [item] = extract('<div itemscope><i itemprop="a">1</i><b><i itemprop="a">2</i></b></div>');
  assert.deepEqual(item.properties.a, ['1', '2']);
});

test('keeps nested item properties out of the parent', () => {
  const [item] = extract('<div itemscope><div itemprop="child" itemscope><span itemprop="name">inner</span></div></div>');
  assert.equal(item.properties.name, undefined);
  assert.deepEqual(item.properties.child[0].properties.name, ['inner']);
});

test('treats sibling top-level scopes as separate items', () => {
  assert.equal(extract('<div itemscope></div><div itemscope></div>').length, 2);
});

test('flattens nested items', () => {
  const items = extract('<div itemscope><div itemprop="a" itemscope><div itemprop="b" itemscope></div></div></div>');
  assert.equal(flattenItems(items).length, 3);
});

test('truncates pathological nesting without overflowing the stack', () => {
  const depth = MAX_ITEM_DEPTH + 40;
  const html = `${'<div itemprop="n" itemscope>'.repeat(depth)}${'</div>'.repeat(depth)}`;
  const items = flattenItems(extract(`<div itemscope>${html}</div>`));
  assert.ok(items.some((item) => item.truncated));
  assert.ok(items.length <= MAX_ITEM_DEPTH + 1);
});
