import { lineOf } from '../html/tree.mjs';

export function finding(rule, severity, message, node) {
  return { rule, severity, message, line: node ? lineOf(node) : null };
}
