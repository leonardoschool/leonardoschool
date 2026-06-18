# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The version lives in `package.json` (`version`) and is shown by the badge at the bottom-left of the app.

## [Unreleased]

## [1.0.1] - 2026-06-18

### Changed
- "Fill section": questions are now drawn (and listed) following a fixed type order — single-answer first, then open-answer — instead of the previous open-first order. The per-type split summary reflects the same order.

## [1.0.0] - 2026-06-18

First tracked release: from here on every change bumps the version and updates this changelog.

### Added
- Inline image support in questions and simulations, with optimized rendering in print too.
- Structured name handling (`firstName`/`lastName`) and price snapshot on contracts.
- Admin onboarding: the admin can activate/deactivate the account and assign/revoke contracts **before** the student confirms their profile; on first login the student finds the admin-entered personal data **already pre-filled** and editable. Autonomous self-registration is unchanged.
- Discreet version badge in the frontend (bottom-left), hidden in print.

### Changed
- Login: email and password are trimmed before being sent to Firebase, fixing the "same credentials work on one device but not another" cases caused by autofill/copy-paste.

### Fixed
- Uploading materials into a folder: `materials.createBatch` linked the folder through a non-existent `category` field; it now correctly uses the many-to-many `categories` relation (`MaterialCategoryLink`).
- Removed a useless reassignment of `globalQuestionNumber` in simulation printing (a lint error that broke the CI build).

### Infrastructure / Database
- Adopted **Prisma migrations**: created the initial `0_init` migration and baselined local, test and production (Neon) databases with no data loss.
- `prisma.config.ts` uses Neon's **direct** connection (`DATABASE_URL_UNPOOLED`) for CLI commands, falling back to `DATABASE_URL` locally.
- Automatic migration deploy on Vercel: `scripts/prisma-deploy.ts` runs `prisma migrate deploy` **only** on production builds (never on preview or locally).
- Fixed `pnpm lint` locally: reinstalled `@babel/core` (corrupted in the pnpm store) and added it as an explicit dependency.

[Unreleased]: https://github.com/marcimastro98/leonardoschool/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/marcimastro98/leonardoschool/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/marcimastro98/leonardoschool/releases/tag/v1.0.0
