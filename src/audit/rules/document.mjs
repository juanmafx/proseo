import { getAttribute, isHtmlElement, textContent, tokenList } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';

const TITLE_RANGE = { min: 30, max: 60 };
const DESCRIPTION_RANGE = { min: 70, max: 160 };

function checkLanguage({ elements }) {
  const html = elements.find((element) => element.tagName === 'html');
  return getAttribute(html, 'lang')?.trim()
    ? []
    : [finding('html-lang', 'error', 'The html element needs a lang attribute', html)];
}

function checkLength(rule, label, value, range, node) {
  const { length } = value;
  return length < range.min || length > range.max
    ? [finding(rule, 'warning', `${label} is ${length} characters; aim for ${range.min}-${range.max}`, node)]
    : [];
}

function checkTitle({ elements }) {
  const titles = elements.filter((element) => isHtmlElement(element, 'title'));
  if (titles.length !== 1) {
    return [finding('title', 'error', `Expected one title, found ${titles.length}`, titles[1])];
  }
  return checkLength('title-length', 'Title', textContent(titles[0]), TITLE_RANGE, titles[0]);
}

function checkDescription({ elements }) {
  const descriptions = elements.filter(
    (element) => element.tagName === 'meta' && getAttribute(element, 'name')?.toLowerCase() === 'description',
  );
  if (descriptions.length !== 1) {
    return [finding('meta-description', 'error', `Expected one meta description, found ${descriptions.length}`, descriptions[1])];
  }
  const content = (getAttribute(descriptions[0], 'content') ?? '').trim();
  return checkLength('meta-description-length', 'Meta description', content, DESCRIPTION_RANGE, descriptions[0]);
}

function checkCanonical({ elements }) {
  const canonicals = elements.filter(
    (element) => element.tagName === 'link' && tokenList(getAttribute(element, 'rel')).includes('canonical'),
  );
  if (canonicals.length !== 1) {
    return [finding('canonical', 'error', `Expected one canonical link, found ${canonicals.length}`, canonicals[1])];
  }
  const href = getAttribute(canonicals[0], 'href') ?? '';
  return URL.canParse(href) && new URL(href).protocol === 'https:'
    ? []
    : [finding('canonical', 'error', 'Canonical URL must be absolute https', canonicals[0])];
}

function checkViewport({ elements }) {
  const present = elements.some(
    (element) => element.tagName === 'meta' && getAttribute(element, 'name')?.toLowerCase() === 'viewport',
  );
  return present ? [] : [finding('viewport', 'warning', 'Missing viewport meta tag')];
}

function checkHeadings({ elements }) {
  const headings = elements.filter((element) => /^h[1-6]$/.test(element.tagName));
  const results = [];
  const primary = headings.filter((heading) => heading.tagName === 'h1');
  if (primary.length !== 1) {
    results.push(finding('single-h1', 'error', `Expected one h1, found ${primary.length}`, primary[1]));
  }
  headings.forEach((heading, index) => {
    if (index === 0) {
      return;
    }
    const level = Number(heading.tagName[1]);
    const previous = Number(headings[index - 1].tagName[1]);
    if (level > previous + 1) {
      results.push(finding('heading-order', 'warning', `Heading jumps from h${previous} to h${level}`, heading));
    }
  });
  return results;
}

export const documentRules = [checkLanguage, checkTitle, checkDescription, checkCanonical, checkViewport, checkHeadings];
