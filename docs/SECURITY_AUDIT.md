# Security Audit

**Date:** 2026-11-24. **Scope:** the working tree on `modernize/2026` and the full Git history of this repository. This is a repository review with local tooling, not a third-party penetration test.

## Method

- `gitleaks` with redaction over all commits and the working tree
- Pattern scan of tracked content for email addresses and phone numbers, plus a review of commit metadata
- `npm audit` and `npm audit signatures` against the locked dependency tree
- Manual review of all source, HTML, CSS, workflow, and project metadata
- Crafted HTML inputs up to 5 MiB against the CLI, including crashes, resource exhaustion, and XSS vectors
- Headless Chrome load of the built page from a local server at desktop and mobile widths

## Results

| Check | Result |
| --- | --- |
| `gitleaks` on history and tree | No leaks found |
| Personal emails or phone numbers in tracked files | None found |
| Personal email in commit metadata | Present in the author field of the six 2016 commits |
| `npm audit` | 0 known vulnerabilities on the audit date |
| Content Security Policy violations in Chrome | None logged |
| Requests made by the page in Chrome | Same-origin only |

## Fixed

| Severity | Issue | Resolution |
| --- | --- | --- |
| High | A file under 2 KB with nested multi-token `itemprop` values exhausted memory and aborted the CLI | Extraction budgets and a `microdata-size` finding |
| High | `audit /dev/zero` exhausted memory, and a named pipe blocked forever | Only regular files are read, with a bounded read |
| Medium | Property names such as `constructor` crashed the auditor | Properties are stored as own keys |
| Medium | Nested or very wide markup caused quadratic hangs or a stack overflow | Linear checks and iterative child traversal |
| Medium | Script in a declarative shadow root, `iframe srcdoc`, and executable `data:` URLs passed the audit | Rules now cover these vectors |
| Medium | Empty, wildcard, or misplaced Content Security Policies passed the audit | The policy must be in `head` and restrict script sources |
| Medium | End-of-life framework (Bootstrap 3.0.3) | Removed and replaced with project-owned CSS |
| Low | Insecure `object`, `poster`, and `srcset` resources and backslash-prefixed external scripts were missed | Resource checks extended |
| Low | Bidirectional and C1 control characters were accepted in catalog text | Rejected at validation |
| Low | No Content Security Policy on the page | Added a restrictive policy with no script sources |
| Low | Third-party font request exposed visitor IP addresses | Removed; the page uses system fonts |
| Low | Unused generator metadata (`params.json`) | Removed |
| Info | Third-party attribution missing from the vendored stylesheet | Restored in `NOTICE.md` |

## Not applicable

The project has no contact form, login, session, server endpoint, or database connection. CSRF protection, two-factor authentication, password hashing, and server-side injection controls therefore have nothing to protect. The optional SQL schema is exercised only with bound parameters.

## Open items

| Severity | Item | Status |
| --- | --- | --- |
| Low | GitHub Pages does not allow custom response headers, so HSTS and `frame-ancestors` cannot be set by this repository | Accepted; the page has no state or actions to protect |
| Low | Private vulnerability reporting is disabled for the repository | Owner decision |
| Low | A personal email remains in the metadata of the public 2016 commits | Owner decision; removal requires a history rewrite |
| Info | The superseded framework remains in Git history | Accepted; history is not rewritten and it is not served after merge |
