# Changelog

This project follows [Semantic Versioning](https://semver.org). Revisions from 2016 were never versioned or tagged, so they are treated as the 1.x line.

## [2.0.0] - 2026-11-23

Prepared on `modernize/2026`. Not tagged or released yet.

### Added

- Catalog validation and a renderer with context-safe escaping
- Nested schema.org microdata: WebPage, ItemList, Product, and Brand
- CLI commands `build`, `audit`, and `extract`
- Audit rules for SEO, microdata, security, accessibility, and layout stability
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
