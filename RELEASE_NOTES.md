# Proseo 2.0.0 Release Notes

Proseo 2.0.0 turns a 2016 placeholder into a working generator and auditor for product pages with schema.org microdata.

## Highlights

- Generates the page from a validated catalog with escaped output
- Audits HTML for SEO, microdata, security, and accessibility problems
- Ships no client-side JavaScript and makes no third-party requests
- Includes automated tests, a recorded test report, and CI

## Breaking changes

- `css.css`, `stylesheets/`, and `params.json` no longer exist.
- `index.html` is now generated. Edit `data/catalog.json` and run `npm run build`.
- Node.js 24 or later is required for the toolchain.

## Upgrade notes

Merging this work into `master` changes the live GitHub Pages site, because Pages publishes from the `master` root.

## Status

Prepared for release. No tag or GitHub release has been created.
