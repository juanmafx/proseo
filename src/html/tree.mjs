import { parse } from 'parse5';

export function parseDocument(html) {
  return parse(html, { sourceCodeLocationInfo: true });
}

export function isElement(node) {
  return typeof node.tagName === 'string';
}

export function getAttribute(element, name) {
  return element.attrs?.find((attribute) => attribute.name === name)?.value;
}

export function hasAttribute(element, name) {
  return getAttribute(element, name) !== undefined;
}

export function listElements(root) {
  const elements = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (isElement(node)) {
      elements.push(node);
    }
    const children = node.childNodes ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }
  return elements;
}

export function textContent(root) {
  const parts = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.nodeName === '#text') {
      parts.push(node.value);
    }
    const children = node.childNodes ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function lineOf(node) {
  return node.sourceCodeLocation?.startLine ?? null;
}

export function hasAncestorWithAttribute(element, name) {
  let current = element.parentNode;
  while (current) {
    if (isElement(current) && hasAttribute(current, name)) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}
