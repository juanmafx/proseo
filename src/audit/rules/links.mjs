import { getAttribute, hasAttribute, textContent } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';

const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'data', 'poster'];
const IGNORED_URL_CHARACTERS = /[\u0000- \u007f-\u009f]/g;

export function normalizeUrl(value) {
  return value.replace(IGNORED_URL_CHARACTERS, '').toLowerCase();
}

function isExecutableUrl(value) {
  const url = normalizeUrl(value);
  return url.startsWith('javascript:') || url.startsWith('vbscript:') || url.startsWith('data:text/html');
}

function checkUnsafeSchemes({ elements }) {
  const results = [];
  for (const element of elements) {
    for (const attribute of URL_ATTRIBUTES) {
      const value = getAttribute(element, attribute);
      if (value !== undefined && isExecutableUrl(value)) {
        results.push(finding('unsafe-url-scheme', 'error', `Executable URL in ${element.tagName} ${attribute}`, element));
      }
    }
  }
  return results;
}

function checkAnchors({ elements }) {
  const results = [];
  for (const anchor of elements.filter((element) => element.tagName === 'a' && hasAttribute(element, 'href'))) {
    const relTokens = (getAttribute(anchor, 'rel') ?? '').toLowerCase().split(/\s+/);
    if (getAttribute(anchor, 'target')?.toLowerCase() === '_blank' && !relTokens.includes('noopener')) {
      results.push(finding('link-target-rel', 'warning', 'Links opening a new tab need rel="noopener"', anchor));
    }
    if (!textContent(anchor) && !getAttribute(anchor, 'aria-label')) {
      results.push(finding('link-text', 'warning', 'Link has no accessible text', anchor));
    }
  }
  return results;
}

export const linkRules = [checkUnsafeSchemes, checkAnchors];
