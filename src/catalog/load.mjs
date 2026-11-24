import { readFile } from 'node:fs/promises';
import { validateCatalog } from './validate.mjs';

export async function loadCatalog(path) {
  const source = await readFile(path, 'utf8');
  return validateCatalog(JSON.parse(source));
}
