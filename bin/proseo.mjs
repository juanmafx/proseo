#!/usr/bin/env node
import { run } from '../src/cli/main.mjs';

const EXIT_BROKEN_PIPE = 141;

process.stdout.on('error', (error) => {
  if (error.code !== 'EPIPE') {
    throw error;
  }
  process.exit(EXIT_BROKEN_PIPE);
});

process.exitCode = await run(process.argv.slice(2));
