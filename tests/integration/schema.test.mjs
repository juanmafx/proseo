import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, afterEach, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const schema = readFileSync(join(fileURLToPath(new URL('../..', import.meta.url)), 'db', 'schema.sql'), 'utf8');
const INSERT_RUN = `INSERT INTO audit_runs (target, tool_version, started_at, error_count, warning_count, item_count)
  VALUES (?, '2.0.0', '2026-11-23T00:00:00Z', 0, 0, 1)`;
const INSERT_FINDING = 'INSERT INTO audit_findings (run_id, rule, severity, message, line) VALUES (?, ?, ?, ?, ?)';
let database;

beforeEach(() => {
  database = new DatabaseSync(':memory:');
  database.exec(schema);
});

afterEach(() => database.close());

test('creates the expected tables and indexes', () => {
  const names = database.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
  assert.deepEqual(names, ['audit_findings', 'audit_runs', 'idx_audit_findings_rule', 'idx_audit_findings_run', 'idx_audit_runs_target_started']);
});

test('applies idempotently', () => {
  assert.doesNotThrow(() => database.exec(schema));
});

test('cascades finding deletion with its run', () => {
  const { lastInsertRowid } = database.prepare(INSERT_RUN).run('index.html');
  database.prepare(INSERT_FINDING).run(lastInsertRowid, 'img-alt', 'error', 'Missing alt', 3);
  database.prepare('DELETE FROM audit_runs WHERE id = ?').run(lastInsertRowid);
  assert.equal(database.prepare('SELECT count(*) AS total FROM audit_findings').get().total, 0);
});

test('rejects unknown severities', () => {
  const { lastInsertRowid } = database.prepare(INSERT_RUN).run('index.html');
  assert.throws(() => database.prepare(INSERT_FINDING).run(lastInsertRowid, 'rule', 'fatal', 'Message', 1), /CHECK/);
});

test('rejects findings without a run', () => {
  assert.throws(() => database.prepare(INSERT_FINDING).run(999, 'rule', 'error', 'Message', 1), /FOREIGN KEY/);
});

test('stores hostile text literally through bound parameters', () => {
  const target = "x'); DROP TABLE audit_runs; --";
  database.prepare(INSERT_RUN).run(target);
  assert.equal(database.prepare('SELECT target FROM audit_runs').get().target, target);
});
