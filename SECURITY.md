# Security Policy

## Supported Versions

Security updates are provided for the following branches:

| Branch   | Supported |
|----------|-----------|
| main     | ✅ Yes    |
| test     | ✅ Yes    |
| develop  | ❌ No     |

Only the `main` branch is considered production-ready.
Security fixes are first validated on `test` and then released to `main`.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue**.

### How to report
Report security issues by using one of the following methods:

- GitHub Security Advisories (preferred)
- Direct email to the repository owner

### What to include
Please include as much information as possible:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Proof of concept (if available)

### Response timeline
- Initial response: **within 72 hours**
- Status update: **within 7 days**
- Fix and disclosure: **as soon as reasonably possible**

### Disclosure policy
We follow a **responsible disclosure** process.
Public disclosure should only happen after a fix has been released.

---

## Automated Security

This project uses automated security tooling:
- Dependabot for dependency updates
- GitHub CodeQL for static analysis
- Protected branches with mandatory CI checks

