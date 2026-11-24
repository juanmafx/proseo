import { readFile } from 'node:fs/promises';
import { CatalogError, validateCatalog } from './validate.mjs';

export async function loadCatalog(path) {
  const source = await readFile(path, 'utf8');
  let catalog;
  try {
    catalog = JSON.parse(source);
  } catch {
    throw new CatalogError(['catalog is not valid JSON']);
  }
  return validateCatalog(catalog);
}
