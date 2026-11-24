import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const reportDirectory = join(root, 'reports', 'tests');
const junitPath = join(reportDirectory, 'junit.xml');

mkdirSync(reportDirectory, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=junit',
    `--test-reporter-destination=${junitPath}`,
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    'tests/**/*.test.mjs',
  ],
  { cwd: root, stdio: 'inherit' },
);

const junit = readFileSync(junitPath, 'utf8')
  .replaceAll(root, '.')
  .replace(/hostname="[^"]*"/g, 'hostname="redacted"');
writeFileSync(junitPath, junit);

const count = (label) => Number(junit.match(new RegExp(`<!-- ${label} (\\d+) -->`))?.[1] ?? 0);
const summary = `# Test Report

| Field | Value |
| --- | --- |
| Generated (UTC) | ${new Date().toISOString()} |
| Runtime | Node.js ${process.version} on ${process.platform}-${process.arch} |
| Command | \`npm run test:report\` |
| Tests | ${count('tests')} |
| Passed | ${count('pass')} |
| Failed | ${count('fail')} |
| Cancelled | ${count('cancelled')} |
| Skipped | ${count('skipped')} |
| Todo | ${count('todo')} |

Per-test results are in [junit.xml](junit.xml). The host name and absolute paths are redacted.
`;
writeFileSync(join(reportDirectory, 'SUMMARY.md'), summary);
process.exitCode = result.status ?? 1;
