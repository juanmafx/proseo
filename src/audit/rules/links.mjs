import { getAttribute, hasAttribute, tokenList } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';

const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'data', 'poster'];
const ANIMATION_TAGS = new Set(['animate', 'set']);
const ANIMATION_VALUE_ATTRIBUTES = ['to', 'from', 'by', 'values'];
const DOCUMENT_TAGS = new Set(['script', 'iframe', 'frame', 'embed', 'object']);
const PASSIVE_MEDIA_TAGS = new Set(['img', 'source', 'video', 'audio', 'track']);
const NAMING_ATTRIBUTES = ['aria-label', 'aria-labelledby', 'title'];
const IGNORED_URL_CHARACTERS = /[\u0000- \u007f-\u009f]/g;
const SCRIPT_SCHEME = /^(?:javascript|vbscript):/;
const MARKUP_DATA_URL = /^data:(?:text\/html|text\/xml|application\/xml|application\/xhtml\+xml|image\/svg\+xml)/;
const REFRESH_TARGET = /url\s*=\s*['"]?([^'"]*)/i;

export function normalizeUrl(value) {
  return value.replace(IGNORED_URL_CHARACTERS, '').replaceAll('\\', '/').toLowerCase();
}

function isExecutableUrl(value, tagName) {
  const url = normalizeUrl(value);
  if (SCRIPT_SCHEME.test(url)) {
    return true;
  }
  if (!url.startsWith('data:') || PASSIVE_MEDIA_TAGS.has(tagName)) {
    return false;
  }
  return DOCUMENT_TAGS.has(tagName) || MARKUP_DATA_URL.test(url);
}

function animationTargets(element) {
  if (!ANIMATION_TAGS.has(element.tagName)) {
    return [];
  }
  const attributeName = (getAttribute(element, 'attributeName') ?? '').toLowerCase();
  if (attributeName !== 'href' && attributeName !== 'xlink:href') {
    return [];
  }
  return ANIMATION_VALUE_ATTRIBUTES.flatMap((attribute) =>
    (getAttribute(element, attribute) ?? '').split(';').map((value) => [attribute, value]),
  );
}

function refreshTargets(element) {
  if (element.tagName !== 'meta' || getAttribute(element, 'http-equiv')?.toLowerCase() !== 'refresh') {
    return [];
  }
  const target = REFRESH_TARGET.exec(getAttribute(element, 'content') ?? '')?.[1];
  return target === undefined ? [] : [['content', target]];
}

function urlCandidates(element) {
  const direct = URL_ATTRIBUTES.map((attribute) => [attribute, getAttribute(element, attribute)]).filter(
    ([, value]) => value !== undefined,
  );
  return [...direct, ...animationTargets(element), ...refreshTargets(element)];
}

function checkUnsafeSchemes({ scanElements }) {
  const results = [];
  for (const element of scanElements) {
    for (const [attribute, value] of urlCandidates(element)) {
      if (isExecutableUrl(value, element.tagName)) {
        results.push(finding('unsafe-url-scheme', 'error', `Executable URL in ${element.tagName} ${attribute}`, element));
      }
    }
  }
  return results;
}

function hasOwnName(element) {
  if (NAMING_ATTRIBUTES.some((attribute) => getAttribute(element, attribute)?.trim())) {
    return true;
  }
  if (element.tagName === 'img' && getAttribute(element, 'alt')?.trim()) {
    return true;
  }
  return element.childNodes.some((child) => child.nodeName === '#text' && child.value.trim());
}

function findNamedElements(elements) {
  const named = new Set();
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (named.has(element) || hasOwnName(element)) {
      named.add(element);
      named.add(element.parentNode);
    }
  }
  return named;
}

function checkAnchors({ elements }) {
  const results = [];
  const named = findNamedElements(elements);
  for (const anchor of elements.filter((element) => element.tagName === 'a' && hasAttribute(element, 'href'))) {
    const relTokens = tokenList(getAttribute(anchor, 'rel'));
    const isolated = relTokens.includes('noopener') || relTokens.includes('noreferrer');
    if (getAttribute(anchor, 'target')?.toLowerCase() === '_blank' && !isolated) {
      results.push(finding('link-target-rel', 'warning', 'Links opening a new tab need rel="noopener"', anchor));
    }
    if (!named.has(anchor)) {
      results.push(finding('link-text', 'warning', 'Link has no accessible text', anchor));
    }
  }
  return results;
}

export const linkRules = [checkUnsafeSchemes, checkAnchors];
