import { parse } from 'parse5';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export function parseDocument(html) {
  return parse(html, { sourceCodeLocationInfo: true });
}

export function isElement(node) {
  return typeof node.tagName === 'string';
}

export function isHtmlElement(node, tagName) {
  return node.tagName === tagName && node.namespaceURI === HTML_NAMESPACE;
}

export function getAttribute(element, name) {
  return element.attrs?.find((attribute) => attribute.name === name)?.value;
}

export function hasAttribute(element, name) {
  return getAttribute(element, name) !== undefined;
}

export function tokenList(value) {
  return (value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
}

export function listElements(root, { includeTemplates = false } = {}) {
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
    if (includeTemplates && node.content) {
      stack.push(node.content);
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
