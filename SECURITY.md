# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| Earlier, unversioned revisions | No |

## Reporting a vulnerability

Please do not publish exploit details in a public issue. Open a GitHub issue that only asks for a private contact channel, and details can then be shared privately.

Reports are handled on a best-effort basis, as this is a personal project with no response-time commitment.

## Security model

- The generated page is static, with no JavaScript, forms, cookies, accounts, or server code.
- Catalog values are validated at build time and escaped at render time.
- The auditor treats input as untrusted: it accepts regular files up to 5 MiB, walks trees iteratively, and limits microdata extraction by depth, values, characters, and node visits.
- CI uses read-only permissions, commit-pinned actions, a lockfile, and disabled lifecycle scripts.

See [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for the latest review.
