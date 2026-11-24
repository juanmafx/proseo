import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_INPUT_BYTES } from '../../src/cli/main.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const binary = join(root, 'bin', 'proseo.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'proseo-cli-'));
const cli = (...args) => spawnSync(process.execPath, [binary, ...args], { cwd: root, encoding: 'utf8' });

after(() => rmSync(scratch, { recursive: true, force: true }));

test('audit exits 0 for the published page', () => {
  const result = cli('audit', 'index.html');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /0 errors, 0 warnings/);
});

test('audit emits parseable JSON', () => {
  const report = JSON.parse(cli('audit', 'index.html', '--format', 'json').stdout);
  assert.equal(report.errors, 0);
  assert.equal(report.items, 1);
});

test('audit exits 1 when errors exist', () => {
  const path = join(scratch, 'bad.html');
  writeFileSync(path, '<html><body><img src="a.png"></body></html>');
  const result = cli('audit', path);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /img-alt/);
});

test('extract prints nested microdata', () => {
  const [page] = JSON.parse(cli('extract', 'index.html').stdout);
  assert.equal(page.properties.mainEntity[0].properties.itemListElement.length, 2);
});

test('build --check passes on committed artifacts', () => {
  assert.equal(cli('build', '--check').status, 0);
});

test('build --check detects stale artifacts in a copy', () => {
  const copy = join(scratch, 'copy');
  for (const entry of ['bin', 'src', 'data', 'assets', 'index.html', 'sitemap.xml', 'package.json']) {
    cpSync(join(root, entry), join(copy, entry), { recursive: true });
  }
  cpSync(join(root, 'node_modules'), join(copy, 'node_modules'), { recursive: true });
  writeFileSync(join(copy, 'index.html'), 'stale');
  const result = spawnSync(process.execPath, [join(copy, 'bin', 'proseo.mjs'), 'build', '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /index\.html/);
});

test('rejects oversized input', () => {
  const path = join(scratch, 'large.html');
  writeFileSync(path, Buffer.alloc(MAX_INPUT_BYTES + 1, 0x20));
  const result = cli('audit', path);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /byte limit/);
});

test('reports missing files without a stack trace', () => {
  const result = cli('audit', join(scratch, 'missing.html'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /ENOENT/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

for (const args of [['unknown'], ['audit'], ['extract'], ['audit', 'index.html', '--format', 'xml'], ['--nope'], []]) {
  test(`exits 2 for usage: ${args.join(' ') || '(none)'}`, () => {
    assert.equal(cli(...args).status, 2);
  });
}

test('help exits 0', () => {
  assert.equal(cli('help').status, 0);
});
