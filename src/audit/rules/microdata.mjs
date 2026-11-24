import { getAttribute, hasAncestorWithAttribute, hasAttribute } from '../../html/tree.mjs';
import { flattenItems, MAX_ITEM_DEPTH } from '../../microdata/extract.mjs';
import { finding } from '../finding.mjs';

const PRODUCT_TYPE = /^https?:\/\/schema\.org\/Product$/;
const RECOMMENDED_PRODUCT_PROPERTIES = ['image', 'description', 'brand'];

function itemNode(item) {
  return item.line === null ? undefined : { sourceCodeLocation: { startLine: item.line } };
}

function checkPresence({ items }) {
  return items.length > 0 ? [] : [finding('microdata-present', 'warning', 'No microdata items found')];
}

function checkAttributes({ elements }) {
  const results = [];
  for (const element of elements) {
    if (hasAttribute(element, 'itemprop') && !hasAncestorWithAttribute(element, 'itemscope')) {
      results.push(finding('microdata-orphan-property', 'error', 'itemprop has no enclosing itemscope', element));
    }
    if (hasAttribute(element, 'itemref')) {
      results.push(finding('microdata-itemref', 'warning', 'itemref is not followed by this auditor', element));
    }
    if (!hasAttribute(element, 'itemscope')) {
      continue;
    }
    const types = (getAttribute(element, 'itemtype') ?? '').split(/\s+/).filter(Boolean);
    if (types.length === 0) {
      results.push(finding('microdata-itemtype', 'warning', 'itemscope has no itemtype', element));
    }
    for (const type of types) {
      if (!URL.canParse(type)) {
        results.push(finding('microdata-itemtype', 'error', 'itemtype must be an absolute URL', element));
      } else if (type.startsWith('http://schema.org/')) {
        results.push(finding('microdata-itemtype-https', 'warning', 'Prefer https for schema.org types', element));
      }
    }
  }
  return results;
}

function checkItems({ items }) {
  const results = [];
  for (const item of flattenItems(items)) {
    if (item.truncated) {
      results.push(finding('microdata-depth', 'error', `Items nest deeper than ${MAX_ITEM_DEPTH} levels`, itemNode(item)));
    }
    if (!item.types.some((type) => PRODUCT_TYPE.test(type))) {
      continue;
    }
    if (!item.properties.name?.some((value) => typeof value === 'string' && value.trim())) {
      results.push(finding('product-name', 'error', 'Product needs a name', itemNode(item)));
    }
    for (const property of RECOMMENDED_PRODUCT_PROPERTIES) {
      if (!item.properties[property]) {
        results.push(finding('product-recommended', 'warning', `Product should define ${property}`, itemNode(item)));
      }
    }
  }
  return results;
}

export const microdataRules = [checkPresence, checkAttributes, checkItems];
