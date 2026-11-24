import { getAttribute, hasAttribute, isElement, lineOf, listElements, textContent } from '../html/tree.mjs';

export const MAX_ITEM_DEPTH = 32;

const SOURCE_ATTRIBUTE_BY_TAG = new Map([
  ['audio', 'src'],
  ['embed', 'src'],
  ['iframe', 'src'],
  ['img', 'src'],
  ['source', 'src'],
  ['track', 'src'],
  ['video', 'src'],
  ['a', 'href'],
  ['area', 'href'],
  ['link', 'href'],
  ['object', 'data'],
  ['data', 'value'],
  ['meter', 'value'],
  ['meta', 'content'],
]);

function tokens(value) {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

function readValue(element, depth) {
  if (hasAttribute(element, 'itemscope')) {
    return readItem(element, depth + 1);
  }
  const attribute = SOURCE_ATTRIBUTE_BY_TAG.get(element.tagName);
  if (attribute) {
    return getAttribute(element, attribute) ?? '';
  }
  if (element.tagName === 'time' && hasAttribute(element, 'datetime')) {
    return getAttribute(element, 'datetime');
  }
  return textContent(element);
}

function readItem(element, depth) {
  const item = {
    types: tokens(getAttribute(element, 'itemtype')),
    id: getAttribute(element, 'itemid') ?? null,
    line: lineOf(element),
    truncated: depth > MAX_ITEM_DEPTH,
    properties: {},
  };
  if (item.truncated) {
    return item;
  }
  const stack = [...element.childNodes].reverse();
  while (stack.length > 0) {
    const node = stack.pop();
    if (!isElement(node)) {
      continue;
    }
    for (const name of tokens(getAttribute(node, 'itemprop'))) {
      item.properties[name] ??= [];
      item.properties[name].push(readValue(node, depth));
    }
    if (!hasAttribute(node, 'itemscope')) {
      stack.push(...[...node.childNodes].reverse());
    }
  }
  return item;
}

export function extractItems(document) {
  return listElements(document)
    .filter((element) => hasAttribute(element, 'itemscope') && !hasAttribute(element, 'itemprop'))
    .map((element) => readItem(element, 1));
}

export function flattenItems(items) {
  const flattened = [];
  const stack = [...items].reverse();
  while (stack.length > 0) {
    const item = stack.pop();
    flattened.push(item);
    const nested = Object.values(item.properties)
      .flat()
      .filter((value) => typeof value === 'object');
    stack.push(...nested.reverse());
  }
  return flattened;
}
