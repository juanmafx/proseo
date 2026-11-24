import { listElements, parseDocument } from '../html/tree.mjs';
import { extractItems } from '../microdata/extract.mjs';
import { documentRules } from './rules/document.mjs';
import { linkRules } from './rules/links.mjs';
import { mediaRules } from './rules/media.mjs';
import { microdataRules } from './rules/microdata.mjs';
import { securityRules } from './rules/security.mjs';

export const MAX_REPORTED_FINDINGS = 1000;

const RULES = [...documentRules, ...mediaRules, ...linkRules, ...securityRules, ...microdataRules];

export function auditHtml(html) {
  const document = parseDocument(html);
  const context = {
    document,
    elements: listElements(document),
    scanElements: listElements(document, { includeTemplates: true }),
    items: extractItems(document),
  };
  const findings = RULES.flatMap((rule) => rule(context)).sort(
    (left, right) => (left.line ?? 0) - (right.line ?? 0) || left.rule.localeCompare(right.rule),
  );
  return {
    findings: findings.slice(0, MAX_REPORTED_FINDINGS),
    omittedFindings: Math.max(0, findings.length - MAX_REPORTED_FINDINGS),
    errors: findings.filter((item) => item.severity === 'error').length,
    warnings: findings.filter((item) => item.severity === 'warning').length,
    items: context.items.length,
  };
}
