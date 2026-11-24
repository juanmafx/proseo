# Security Audit

**Date:** 2026-11-23. **Scope:** the working tree on `modernize/2026` and the full Git history of this repository.

## Method

- Pattern scan of every revision for private keys, cloud and platform tokens, credential assignments, email addresses, and phone numbers
- Manual review of all HTML, CSS, and project metadata
- `npm audit` against the locked dependency tree
- Headless Chrome load of the built page, checking for Content Security Policy violations
- Automated tests with hostile catalog values and pathological markup

## Results

| Check | Result |
| --- | --- |
| Secrets in the tree or history | None found |
| Personal emails or phone numbers in tracked content | None found |
| `npm audit` | 0 known vulnerabilities on the audit date |
| Content Security Policy violations in Chrome | None logged |

## Fixed

| Severity | Issue | Resolution |
| --- | --- | --- |
| Medium | End-of-life framework (Bootstrap 3.0.3) | Removed and replaced with project-owned CSS |
| Low | No Content Security Policy | Added a restrictive policy with no script sources |
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
| Info | The superseded framework remains in Git history | Accepted; history is not rewritten and it is not served after merge |
