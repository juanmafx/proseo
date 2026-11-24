import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateCatalog, CatalogError } from '../../src/catalog/validate.mjs';
import { validCatalog } from '../helpers/fixtures.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const binary = join(root, 'bin', 'proseo.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'proseo-hostile-'));
const cli = (...args) => spawnSync(process.execPath, [binary, ...args], { cwd: root, encoding: 'utf8', timeout: 20000 });

after(() => rmSync(scratch, { recursive: true, force: true }));

function projectCopy(name) {
  const copy = join(scratch, name);
  for (const entry of ['bin', 'src', 'data', 'assets', 'package.json']) {
    cpSync(join(root, entry), join(copy, entry), { recursive: true });
  }
  cpSync(join(root, 'node_modules'), join(copy, 'node_modules'), { recursive: true });
  return copy;
}

test('rejects unbounded character devices', { skip: process.platform === 'win32' }, () => {
  const result = cli('audit', '/dev/zero');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /regular file/);
});

test('rejects named pipes without blocking', { skip: process.platform === 'win32' }, () => {
  const path = join(scratch, 'pipe');
  assert.equal(spawnSync('mkfifo', [path]).status, 0);
  const result = cli('audit', path);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /regular file/);
});

test('rejects directories', () => {
  const path = join(scratch, 'directory');
  mkdirSync(path);
  assert.equal(cli('audit', path).status, 2);
});

test('reports a crafted microdata file without crashing', () => {
  const path = join(scratch, 'prototype.html');
  writeFileSync(path, '<div itemscope><span itemprop="constructor">x</span></div>');
  const result = cli('extract', path);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout)[0].properties.constructor, ['x']);
});

test('reports malformed catalog JSON as invalid input', () => {
  const copy = projectCopy('malformed');
  writeFileSync(join(copy, 'data', 'catalog.json'), '{bad');
  const result = spawnSync(process.execPath, [join(copy, 'bin', 'proseo.mjs'), 'build', '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not valid JSON/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('rejects a catalog image that does not exist', () => {
  const copy = projectCopy('missing-image');
  rmSync(join(copy, 'assets', 'images', 'smartphone.svg'));
  const result = spawnSync(process.execPath, [join(copy, 'bin', 'proseo.mjs'), 'build'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /image not found/);
});

for (const [label, character] of [['C1 control', '\u0085'], ['right-to-left override', '\u202e'], ['bidi isolate', '\u2066'], ['line separator', '\u2028']]) {
  test(`rejects a ${label} in catalog text`, () => {
    const catalog = validCatalog();
    catalog.products[0].name = `bad${character}name`;
    assert.throws(() => validateCatalog(catalog), CatalogError);
  });
}

test('exits cleanly when the output pipe closes early', { timeout: 20000 }, async () => {
  const child = spawn(process.execPath, [binary, 'extract', join(root, 'index.html')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdout.destroy();
  await new Promise((resolve) => child.on('close', resolve));
  assert.doesNotMatch(stderr, /\n\s+at /);
});
