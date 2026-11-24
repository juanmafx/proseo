import { getAttribute, hasAttribute, tokenList } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';
import { normalizeUrl } from './links.mjs';

const SOURCE_TAGS = new Set(['script', 'img', 'iframe', 'frame', 'audio', 'video', 'source', 'embed', 'track']);
const SRCSET_TAGS = new Set(['img', 'source']);
const DATA_SCRIPT_TYPES = new Set(['application/ld+json', 'application/json']);
const UNSAFE_POLICY_SOURCES = new Set(["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'"]);
const BROAD_SCRIPT_SOURCES = new Set(['*', 'http:', 'https:', 'data:', 'blob:', 'filesystem:', 'http://*', 'https://*']);
const SCRIPT_OVERRIDE_DIRECTIVES = ['script-src-elem', 'script-src-attr'];

function parsePolicy(content) {
  const directives = new Map();
  for (const entry of content.toLowerCase().split(';')) {
    const [name, ...sources] = entry.trim().split(/\s+/);
    if (name && !directives.has(name)) {
      directives.set(name, sources);
    }
  }
  return directives;
}

function restrictsScripts(directives) {
  const sources = directives.get('script-src') ?? directives.get('default-src');
  if (sources === undefined) {
    return false;
  }
  const overrides = SCRIPT_OVERRIDE_DIRECTIVES.flatMap((name) => directives.get(name) ?? []);
  return ![...sources, ...overrides].some((source) => BROAD_SCRIPT_SOURCES.has(source));
}

function checkContentSecurityPolicy({ elements }) {
  const policies = elements.filter(
    (element) =>
      element.tagName === 'meta' &&
      element.parentNode?.tagName === 'head' &&
      getAttribute(element, 'http-equiv')?.toLowerCase() === 'content-security-policy',
  );
  if (policies.length === 0) {
    return [finding('csp-present', 'error', 'Missing Content-Security-Policy meta tag in head')];
  }
  const parsed = policies.map((policy) => parsePolicy(getAttribute(policy, 'content') ?? ''));
  const results = [];
  parsed.forEach((directives, index) => {
    if ([...directives.values()].flat().some((source) => UNSAFE_POLICY_SOURCES.has(source))) {
      results.push(finding('csp-unsafe', 'error', 'Content-Security-Policy allows unsafe sources', policies[index]));
    }
  });
  if (!parsed.some(restrictsScripts)) {
    results.push(finding('csp-script-policy', 'error', 'Content-Security-Policy does not restrict script sources', policies[0]));
  }
  return results;
}

function checkInlineCode({ scanElements }) {
  const results = [];
  for (const element of scanElements) {
    if (element.attrs.some((attribute) => attribute.name.startsWith('on'))) {
      results.push(finding('inline-handler', 'error', 'Inline event handlers are not allowed', element));
    }
    if (element.tagName === 'iframe' && hasAttribute(element, 'srcdoc')) {
      results.push(finding('iframe-srcdoc', 'error', 'Inline iframe documents are not allowed', element));
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
  return element.tagName === 'link' && tokenList(getAttribute(element, 'rel')).includes('stylesheet');
}

function srcsetUrls(value) {
  return (value ?? '')
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function resourceUrls(element) {
  const urls = [];
  if (isStylesheet(element)) {
    urls.push(getAttribute(element, 'href'));
  }
  if (SOURCE_TAGS.has(element.tagName)) {
    urls.push(getAttribute(element, 'src'));
  }
  if (element.tagName === 'object') {
    urls.push(getAttribute(element, 'data'));
  }
  if (element.tagName === 'video') {
    urls.push(getAttribute(element, 'poster'));
  }
  if (SRCSET_TAGS.has(element.tagName)) {
    urls.push(...srcsetUrls(getAttribute(element, 'srcset')));
  }
  return urls.filter((url) => url !== undefined);
}

function checkResources({ scanElements }) {
  const results = [];
  for (const element of scanElements) {
    for (const value of resourceUrls(element)) {
      const url = normalizeUrl(value);
      if (url.startsWith('http:')) {
        results.push(finding('insecure-resource', 'error', `Insecure resource on ${element.tagName}`, element));
      }
      const external = /^(?:https?:)?\/\//.test(url);
      if (external && (element.tagName === 'script' || isStylesheet(element)) && !hasAttribute(element, 'integrity')) {
        results.push(finding('subresource-integrity', 'warning', `External ${element.tagName} has no integrity hash`, element));
      }
    }
  }
  return results;
}

export const securityRules = [checkContentSecurityPolicy, checkInlineCode, checkResources];
