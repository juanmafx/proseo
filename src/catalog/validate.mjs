const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_PATH = /^assets\/images\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|png|webp|avif)$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028-\u202e\u2066-\u2069]/;

export class CatalogError extends Error {
  constructor(issues) {
    super(`Invalid catalog: ${issues.join('; ')}`);
    this.name = 'CatalogError';
    this.issues = issues;
  }
}

function checkText(issues, path, value, { min = 1, max }) {
  if (typeof value !== 'string' || CONTROL_CHARACTERS.test(value)) {
    issues.push(`${path} must be text without control characters`);
    return;
  }
  const length = value.trim().length;
  if (length < min || length > max) {
    issues.push(`${path} must be ${min}-${max} characters`);
  }
}

function checkHttpsUrl(issues, path, value) {
  if (typeof value !== 'string' || !URL.canParse(value)) {
    issues.push(`${path} must be an absolute URL`);
    return;
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    issues.push(`${path} must use https without credentials`);
  }
}

function checkDimension(issues, path, value) {
  if (!Number.isInteger(value) || value < 1 || value > 4096) {
    issues.push(`${path} must be an integer from 1 to 4096`);
  }
}

function checkSite(issues, site) {
  if (site === null || typeof site !== 'object') {
    issues.push('site must be an object');
    return;
  }
  checkText(issues, 'site.name', site.name, { max: 60 });
  checkText(issues, 'site.title', site.title, { min: 30, max: 60 });
  checkText(issues, 'site.tagline', site.tagline, { max: 160 });
  checkText(issues, 'site.description', site.description, { min: 70, max: 160 });
  checkHttpsUrl(issues, 'site.canonicalUrl', site.canonicalUrl);
  checkHttpsUrl(issues, 'site.repositoryUrl', site.repositoryUrl);
  if (!Number.isInteger(site.createdYear) || site.createdYear < 1990) {
    issues.push('site.createdYear must be a year');
  }
  if (!Number.isInteger(site.modernizedYear) || site.modernizedYear < site.createdYear) {
    issues.push('site.modernizedYear must not precede site.createdYear');
  }
}

function checkProduct(issues, product, index, seenIds) {
  const path = `products[${index}]`;
  if (product === null || typeof product !== 'object') {
    issues.push(`${path} must be an object`);
    return;
  }
  if (typeof product.id !== 'string' || !SLUG.test(product.id)) {
    issues.push(`${path}.id must be a lowercase slug`);
  } else if (seenIds.has(product.id)) {
    issues.push(`${path}.id is duplicated`);
  } else {
    seenIds.add(product.id);
  }
  checkText(issues, `${path}.name`, product.name, { max: 80 });
  checkText(issues, `${path}.brand`, product.brand, { max: 60 });
  checkText(issues, `${path}.category`, product.category, { max: 80 });
  checkText(issues, `${path}.description`, product.description, { max: 300 });
  checkText(issues, `${path}.imageAlt`, product.imageAlt, { max: 125 });
  if (typeof product.image !== 'string' || !IMAGE_PATH.test(product.image)) {
    issues.push(`${path}.image must be a file under assets/images/`);
  }
  checkDimension(issues, `${path}.imageWidth`, product.imageWidth);
  checkDimension(issues, `${path}.imageHeight`, product.imageHeight);
}

export function validateCatalog(catalog) {
  const issues = [];
  if (catalog === null || typeof catalog !== 'object') {
    throw new CatalogError(['catalog must be an object']);
  }
  checkSite(issues, catalog.site);
  if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
    issues.push('products must be a non-empty array');
  } else {
    const seenIds = new Set();
    catalog.products.forEach((product, index) => checkProduct(issues, product, index, seenIds));
  }
  if (issues.length > 0) {
    throw new CatalogError(issues);
  }
  return catalog;
}
