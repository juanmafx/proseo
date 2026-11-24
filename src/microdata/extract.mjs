import { getAttribute, hasAttribute, isElement, lineOf, listElements } from '../html/tree.mjs';

export const MAX_ITEM_DEPTH = 32;
export const MAX_EXTRACTED_VALUES = 100_000;
export const MAX_EXTRACTED_CHARACTERS = 10_000_000;
export const MAX_EXTRACTION_VISITS = 10_000_000;

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

function createBudget() {
  return {
    values: MAX_EXTRACTED_VALUES,
    characters: MAX_EXTRACTED_CHARACTERS,
    visits: MAX_EXTRACTION_VISITS,
    exhausted: false,
  };
}

function spend(budget, resource, amount = 1) {
  budget[resource] -= amount;
  if (budget[resource] < 0) {
    budget.exhausted = true;
  }
  return !budget.exhausted;
}

function pushChildren(stack, node) {
  const children = node.childNodes ?? [];
  for (let index = children.length - 1; index >= 0; index -= 1) {
    stack.push(children[index]);
  }
}

function readText(element, budget) {
  const parts = [];
  const stack = [element];
  while (stack.length > 0 && spend(budget, 'visits')) {
    const node = stack.pop();
    if (node.nodeName === '#text' && spend(budget, 'characters', node.value.length)) {
      parts.push(node.value);
    }
    pushChildren(stack, node);
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

function readValue(element, depth, budget) {
  if (hasAttribute(element, 'itemscope')) {
    return readItem(element, depth + 1, budget);
  }
  const attribute = SOURCE_ATTRIBUTE_BY_TAG.get(element.tagName);
  if (attribute) {
    return getAttribute(element, attribute) ?? '';
  }
  if (element.tagName === 'time' && hasAttribute(element, 'datetime')) {
    return getAttribute(element, 'datetime');
  }
  return readText(element, budget);
}

function readProperties(element, depth, budget) {
  const properties = new Map();
  const stack = [];
  pushChildren(stack, element);
  while (stack.length > 0 && spend(budget, 'visits')) {
    const node = stack.pop();
    if (!isElement(node)) {
      continue;
    }
    for (const name of new Set(tokens(getAttribute(node, 'itemprop')))) {
      if (!spend(budget, 'values')) {
        break;
      }
      if (!properties.has(name)) {
        properties.set(name, []);
      }
      properties.get(name).push(readValue(node, depth, budget));
    }
    if (!hasAttribute(node, 'itemscope')) {
      pushChildren(stack, node);
    }
  }
  return Object.fromEntries(properties);
}

function readItem(element, depth, budget) {
  const item = {
    types: tokens(getAttribute(element, 'itemtype')),
    id: getAttribute(element, 'itemid') ?? null,
    line: lineOf(element),
    truncated: false,
    properties: {},
  };
  if (depth > MAX_ITEM_DEPTH) {
    item.truncated = 'depth';
    return item;
  }
  if (spend(budget, 'values')) {
    item.properties = readProperties(element, depth, budget);
  }
  if (budget.exhausted) {
    item.truncated = 'size';
  }
  return item;
}

export function extractItems(document) {
  const budget = createBudget();
  const items = [];
  for (const element of listElements(document)) {
    if (budget.exhausted) {
      break;
    }
    if (hasAttribute(element, 'itemscope') && !hasAttribute(element, 'itemprop')) {
      items.push(readItem(element, 1, budget));
    }
  }
  return items;
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
    for (let index = nested.length - 1; index >= 0; index -= 1) {
      stack.push(nested[index]);
    }
  }
  return flattened;
}
