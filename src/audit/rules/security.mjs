import { getAttribute, hasAttribute } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';
import { normalizeUrl } from './links.mjs';

const RESOURCE_TAGS = new Set(['script', 'img', 'iframe', 'audio', 'video', 'source', 'embed', 'track']);
const DATA_SCRIPT_TYPES = new Set(['application/ld+json', 'application/json']);

function checkContentSecurityPolicy({ elements }) {
  const policy = elements.find(
    (element) =>
      element.tagName === 'meta' &&
      getAttribute(element, 'http-equiv')?.toLowerCase() === 'content-security-policy',
  );
  if (!policy) {
    return [finding('csp-present', 'error', 'Missing Content-Security-Policy meta tag')];
  }
  const content = (getAttribute(policy, 'content') ?? '').toLowerCase();
  return content.includes("'unsafe-inline'") || content.includes("'unsafe-eval'")
    ? [finding('csp-unsafe', 'error', 'Content-Security-Policy allows unsafe sources', policy)]
    : [];
}

function checkInlineCode({ elements }) {
  const results = [];
  for (const element of elements) {
    if (element.attrs.some((attribute) => attribute.name.startsWith('on'))) {
      results.push(finding('inline-handler', 'error', 'Inline event handlers are not allowed', element));
    }
    if (element.tagName === 'script' && !hasAttribute(element, 'src')) {
      const type = (getAttribute(element, 'type') ?? '').trim().toLowerCase();
      if (!DATA_SCRIPT_TYPES.has(type)) {
        results.push(finding('inline-script', 'error', 'Inline scripts are not allowed', element));
      }
    }
  }
  return results;
}

function isStylesheet(element) {
  return element.tagName === 'link' && (getAttribute(element, 'rel') ?? '').toLowerCase().split(/\s+/).includes('stylesheet');
}

function resourceUrl(element) {
  if (isStylesheet(element)) {
    return getAttribute(element, 'href');
  }
  return RESOURCE_TAGS.has(element.tagName) ? getAttribute(element, 'src') : undefined;
}

function checkResources({ elements }) {
  const results = [];
  for (const element of elements) {
    const value = resourceUrl(element);
    if (value === undefined) {
      continue;
    }
    const url = normalizeUrl(value);
    if (url.startsWith('http:')) {
      results.push(finding('insecure-resource', 'error', `Insecure resource on ${element.tagName}`, element));
    }
    const external = /^(?:https?:)?\/\//.test(url);
    if (external && (element.tagName === 'script' || isStylesheet(element)) && !hasAttribute(element, 'integrity')) {
      results.push(finding('subresource-integrity', 'warning', `External ${element.tagName} has no integrity hash`, element));
    }
  }
  return results;
}

export const securityRules = [checkContentSecurityPolicy, checkInlineCode, checkResources];
