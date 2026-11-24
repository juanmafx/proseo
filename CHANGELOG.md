# Changelog

This project follows [Semantic Versioning](https://semver.org). Revisions from 2016 were never versioned or tagged, so they are treated as the 1.x line.

## [2.0.0] - 2026-11-24

Prepared on `modernize/2026`. Not tagged or released yet.

### Added

- Catalog validation and a renderer with context-safe escaping
- Nested schema.org microdata: WebPage, ItemList, Product, and Brand
- CLI commands `build`, `audit`, and `extract`
- Audit rules for SEO, microdata, security, accessibility, and layout stability
- Report cap of 1,000 listed findings with exact totals
- Automated test suite, recorded test report, and least-privilege CI
- Optional SQLite schema for audit history
- README, architecture, security, audit, notice, and release documents

### Changed

- **Breaking:** replaced the GitHub Pages placeholder with a generated page
- **Breaking:** moved styling to `assets/css/site.css`
- All content is now in English

### Removed

- **Breaking:** `css.css` (Bootstrap 3.0.3), `stylesheets/`, and `params.json`
- Third-party font request

### Security

- Added a restrictive Content Security Policy and removed all third-party requests
- Restored third-party attribution in `NOTICE.md`
- Bounded microdata extraction against crafted input that caused crashes, memory exhaustion, or quadratic run time
- Rejected non-regular input files, so devices and named pipes cannot exhaust memory or block the CLI
- Extended the audit to template content, `iframe srcdoc`, executable `data:` URLs, meta refresh, SVG animation targets, and weak or misplaced Content Security Policies
- Rejected Unicode bidirectional and C1 control characters in catalog text
