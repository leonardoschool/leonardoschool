# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The version lives in `package.json` (`version`) and is shown by the badge at the bottom-left of the app.

## [Unreleased]

## [1.0.2] - 2026-06-18

### Fixed
- Contract assignment: the rendered/printed contract document now shows the admin-overridden amount (`priceSnapshot`) instead of the original template price. The "Importo" field kept the template price even when the admin changed it while personalizing the template.
- Revenue stats now sum each contract's frozen `priceSnapshot` (falling back to the template price for older contracts), so admin price overrides are reflected in totals and monthly revenue.

## [1.0.1] - 2026-06-18

### Changed
- "Fill section": questions are now drawn (and listed) following a fixed type order — single-answer first, then open-answer — instead of the previous open-first order. The per-type split summary reflects the same order.
- Homepage hero background reworked into an interactive pseudo-3D "molecular universe": a rotating DNA double-helix core whose rungs are complementary base pairs (A-T / G-C, each nucleotide colour-coded), surrounded by a network of chemistry/physics/math/biology notation (incl. DNA, RNA, NADH, ATP, Hb) linked by bonds, with electrons orbiting nuclei and signal pulses travelling along the bonds like nerve impulses. It has perspective depth, a framing vignette, tilts toward the pointer (mouse/touch), and renders on a plain 2D canvas with no new dependencies. Particle count and pixel density scale down on mobile; the animation respects `prefers-reduced-motion` (static frame) and pauses when off-screen or the tab is hidden. Replaces the previous static CSS symbol layer (`ScienceCanvasLight`).

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
