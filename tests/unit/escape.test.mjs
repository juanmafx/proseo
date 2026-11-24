import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeHtml } from '../../src/html/escape.mjs';

test('escapes every HTML-significant character', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;');
});

test('escapes ampersands exactly once', () => {
  assert.equal(escapeHtml('&amp;'), '&amp;amp;');
});

test('converts non-string values to text', () => {
  assert.equal(escapeHtml(42), '42');
});
