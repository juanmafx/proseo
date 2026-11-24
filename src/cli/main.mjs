import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { auditHtml } from '../audit/engine.mjs';
import { CatalogError } from '../catalog/validate.mjs';
import { parseDocument } from '../html/tree.mjs';
import { extractItems } from '../microdata/extract.mjs';
import { findStaleArtifacts, writeArtifacts } from '../render/site.mjs';

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const EXIT = { ok: 0, findings: 1, usage: 2 };

const DEFAULT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const USAGE = `Usage:
  proseo build [--check]
  proseo audit <file> [--format text|json]
  proseo extract <file>
  proseo help
`;

class UsageError extends Error {}

async function readBoundedFile(path) {
  const handle = await open(path, 'r');
  try {
    const { size } = await handle.stat();
    if (size > MAX_INPUT_BYTES) {
      throw new UsageError(`Input exceeds the ${MAX_INPUT_BYTES} byte limit`);
    }
    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}

async function build(values, io) {
  if (values.check) {
    const stale = await findStaleArtifacts(io.root);
    if (stale.length > 0) {
      io.stderr.write(`Stale artifacts: ${stale.join(', ')}. Run: npm run build\n`);
      return EXIT.findings;
    }
    io.stdout.write('Artifacts are up to date\n');
    return EXIT.ok;
  }
  const written = await writeArtifacts(io.root);
  io.stdout.write(`Wrote ${written.join(', ')}\n`);
  return EXIT.ok;
}

function formatReport(report) {
  const lines = report.findings.map(
    ({ severity, rule, message, line }) => `${severity.padEnd(7)} ${rule} (line ${line ?? '-'}): ${message}`,
  );
  lines.push(`${report.errors} errors, ${report.warnings} warnings, ${report.items} top-level items`);
  return `${lines.join('\n')}\n`;
}

async function audit(values, positionals, io) {
  const format = values.format ?? 'text';
  if (positionals.length !== 1 || !['text', 'json'].includes(format)) {
    throw new UsageError('audit needs one file and a format of text or json');
  }
  const report = auditHtml(await readBoundedFile(positionals[0]));
  io.stdout.write(format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
  return report.errors > 0 ? EXIT.findings : EXIT.ok;
}

async function extract(positionals, io) {
  if (positionals.length !== 1) {
    throw new UsageError('extract needs one file');
  }
  const items = extractItems(parseDocument(await readBoundedFile(positionals[0])));
  io.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
  return EXIT.ok;
}

async function dispatch(argv, io) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { check: { type: 'boolean' }, format: { type: 'string' } },
  });
  const [command, ...rest] = positionals;
  switch (command) {
    case 'build':
      return build(values, io);
    case 'audit':
      return audit(values, rest, io);
    case 'extract':
      return extract(rest, io);
    case 'help':
    case undefined:
      io.stdout.write(USAGE);
      return command ? EXIT.ok : EXIT.usage;
    default:
      throw new UsageError(`Unknown command: ${command}`);
  }
}

export async function run(argv, overrides = {}) {
  const io = { stdout: process.stdout, stderr: process.stderr, root: DEFAULT_ROOT, ...overrides };
  try {
    return await dispatch(argv, io);
  } catch (error) {
    if (error instanceof CatalogError || error instanceof UsageError || error.code?.startsWith?.('ERR_PARSE_ARGS')) {
      io.stderr.write(`${error.message}\n${error instanceof CatalogError ? '' : USAGE}`);
      return EXIT.usage;
    }
    if (error.code === 'ENOENT' || error.code === 'EISDIR' || error.code === 'EACCES') {
      io.stderr.write(`Cannot read input: ${error.code}\n`);
      return EXIT.usage;
    }
    throw error;
  }
}
