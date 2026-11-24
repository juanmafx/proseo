import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadCatalog } from '../catalog/load.mjs';
import { CatalogError } from '../catalog/validate.mjs';
import { renderPage } from './page.mjs';
import { renderSitemap } from './sitemap.mjs';

async function assertImagesExist(rootDirectory, { products }) {
  const missing = [];
  for (const { image } of products) {
    const found = await access(join(rootDirectory, image)).then(() => true, () => false);
    if (!found) {
      missing.push(`image not found: ${image}`);
    }
  }
  if (missing.length > 0) {
    throw new CatalogError(missing);
  }
}

export async function renderArtifacts(rootDirectory) {
  const catalog = await loadCatalog(join(rootDirectory, 'data', 'catalog.json'));
  await assertImagesExist(rootDirectory, catalog);
  return new Map([
    ['index.html', renderPage(catalog)],
    ['sitemap.xml', renderSitemap(catalog)],
  ]);
}

export async function writeArtifacts(rootDirectory) {
  const artifacts = await renderArtifacts(rootDirectory);
  for (const [name, content] of artifacts) {
    await writeFile(join(rootDirectory, name), content, 'utf8');
  }
  return [...artifacts.keys()];
}

export async function findStaleArtifacts(rootDirectory) {
  const artifacts = await renderArtifacts(rootDirectory);
  const stale = [];
  for (const [name, expected] of artifacts) {
    const actual = await readFile(join(rootDirectory, name), 'utf8').catch(() => null);
    if (actual !== expected) {
      stale.push(name);
    }
  }
  return stale;
}
