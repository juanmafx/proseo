# Proseo

Proseo generates a static product page with nested [schema.org](https://schema.org) microdata and SEO metadata, then audits the resulting HTML for SEO, structured data, and security problems.

> **Project history:** originally created in 2016, modernized in 2026.

## Purpose

Structured data tends to break quietly: a property lands outside its scope, a page loses its canonical URL, or a template starts emitting unescaped text. Nothing looks wrong in the browser, so the problem goes unnoticed.

Proseo treats page markup as something that can be verified. A validated catalog supplies the site metadata and product entries, the renderer escapes every interpolated value, and `npm run check` fails when the generated HTML has an error-severity finding. Warnings are reported without failing the check.

## Why this project exists

The 2016 version was an experiment in combining microdata and SEO with a CSS framework for a phone product landing page. It never got past a placeholder layout and contained no actual microdata. This version delivers what the original set out to do.

## What it does

| Command | Result |
| --- | --- |
| `proseo build` | Validates `data/catalog.json` and writes `index.html` and `sitemap.xml` |
| `proseo build --check` | Fails if the committed artifacts differ from the renderer output |
| `proseo audit <file>` | Checks an HTML file against the audit rules, as text or JSON |
| `proseo extract <file>` | Prints the microdata item tree as JSON |

The audit rules cover:

- **SEO:** `lang`, title, meta description, canonical URL, viewport, single `h1`, heading order
- **Microdata:** orphaned properties, invalid or missing types, required and recommended `Product` properties, nesting depth, extraction size limits
- **Security:** Content Security Policy presence and script restrictions, inline scripts and handlers including template content, `iframe srcdoc`, executable URLs, insecure resources, subresource integrity
- **Accessibility and layout:** image `alt` text, image dimensions, link text

The auditor is a static baseline check. A clean result means these rules found nothing; it does not prove that a page is free of XSS or other vulnerabilities.

The catalog holds **sample data**. Nothing is sold, so the page deliberately publishes no prices, ratings, or availability. Search engines generally require such properties for product rich results, so this page is not expected to qualify for them.

## Architecture

```text
data/catalog.json -> catalog validation -> renderer -> index.html, sitemap.xml
                                                            |
                                     audit rules <- HTML parser + microdata extractor
```

Proseo is a static site with a build-time CLI. It has no backend, so there is no frontend/backend split. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requires Node.js 24 or later.

```bash
git clone https://github.com/juanmafx/proseo.git
cd proseo
npm ci --ignore-scripts
npm run check
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/>.

## Usage guide

1. Edit `data/catalog.json`.
2. Run `npm run build` to regenerate the page.
3. Run `npm run audit:page` to check it.
4. Commit the catalog together with the regenerated artifacts.

Audit any other HTML file:

```bash
node bin/proseo.mjs audit path/to/page.html
node bin/proseo.mjs audit path/to/page.html --format json
node bin/proseo.mjs extract path/to/page.html
```

Exit codes: `0` success, `1` audit errors or stale artifacts, `2` invalid usage, invalid catalog, or unreadable input, `141` output pipe closed early.

Input limits: audited files must be regular files of at most 5 MiB. Text reports and JSON reports list the first 1,000 findings and keep exact error and warning totals.

## Configuration

All configuration lives in `data/catalog.json`.

| Field | Constraint |
| --- | --- |
| `site.title` | 30-60 characters |
| `site.description` | 70-160 characters |
| `site.canonicalUrl`, `site.repositoryUrl` | Absolute `https` URL without credentials |
| `site.createdYear`, `site.modernizedYear` | Years, in chronological order |
| `products[].id` | Unique lowercase slug |
| `products[].image` | Existing file under `assets/images/` |
| `products[].imageWidth`, `imageHeight` | Integer from 1 to 4096 |

No environment variables or secrets are required.

## Database (optional)

[db/schema.sql](db/schema.sql) is an **optional** SQLite schema for keeping audit history. The CLI does not read or write a database, and the site works without one.

```bash
sqlite3 proseo.sqlite < db/schema.sql
```

The schema uses `STRICT` tables, which require SQLite 3.37 or later.

## Testing

```bash
npm test
npm run test:report
```

Tests use the built-in Node.js test runner and cover unit behavior, the CLI, the published page, and the SQL schema. The report from the most recent recorded run is in [reports/tests/SUMMARY.md](reports/tests/SUMMARY.md), with per-test results in [reports/tests/junit.xml](reports/tests/junit.xml).

## Security

The generated page runs no JavaScript, loads nothing from third parties, and ships a restrictive Content Security Policy. See [SECURITY.md](SECURITY.md) and [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).

## Credits and license

Earlier revisions included third-party code, including Bootstrap and the Cayman theme. They are credited in [NOTICE.md](NOTICE.md).

This repository does not currently declare a license for its original code, so no reuse rights are granted by default.
