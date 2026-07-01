# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The version lives in `package.json` (`version`) and is shown by the badge at the bottom-left of the app.

## [Unreleased]

## [1.1.1] - 2026-07-01

### Changed
- Calendar events created when assigning a simulation now use the **simulation name as-is**, without the `TOLC: ` / `Simulazione: ` prefix (the event is already tagged as a simulation). Deletion of assignment events still matches the old prefixed titles, so events created before this change are cleaned up correctly.

### Fixed
- Question/answer **images now appear everywhere a question is shown**, not just in the TOLC layout and admin question detail. Previously several views rendered only the question text and dropped the picture stored in the `imageUrl` field — so figures were missing for students (e.g. CINECA-imported questions, whose text keeps a raw `\includegraphics{filename}` that can't be resolved client-side while the real picture lives in `imageUrl`). Fixed views:
  - **Standard simulation player** (`QuestionPanel`) — the main test-taking layout: question image + per-answer images.
  - **Result review** (`/simulazioni/[id]/risultato`) — question image + answer images in the per-question breakdown.
  - **Study mode** (`/simulazioni/studio`) — question image + answer images.
  - **Simulation print sheet** (`/simulazioni/[id]/stampa`) — added the per-answer images (the question image was already printed).
  - **Staff simulation detail** — shows the question image and correct-answer images when a question row is expanded.
  - **Open-answer correction** (`/simulazioni/risposte-aperte/[id]`) — shows the question image.
  - **Student simulations history** (`/studenti/[id]/simulazioni`) — shows the image on each wrong question.
  The relevant tRPC queries now also select `imageUrl`/`imageAlt` where they weren't before (`getResultDetails`, `getByIds`, `getOpenAnswersForResult`, `getStudentSimulations`).
- Text rendering: a bare-filename `\includegraphics{file.png}` (with no path or URL) is **no longer turned into a broken `<img>`**. Such references only come from imports that also store the real picture in `imageUrl`, and the token-less Firebase URL they produced returned 403 — showing a broken image and causing layout jumps. They are now stripped, and the picture is served from `imageUrl` instead.

## [1.1.0] - 2026-06-24

### Added
- Simulation question management ("Gestione Domande"): added a **topic ("argomento") filter** to the "Domande disponibili" panel, alongside the existing subject, difficulty and type filters. The topic list is scoped to the selected subject (or shows all topics across subjects when none is selected) and resets when the subject changes. Available both when creating a simulation and when editing an existing one.

### Changed
- Editing an existing simulation's questions now supports **reordering questions with up/down arrows in the sectioned view** (and in the "Senza sezione" bucket), matching the flat-list behaviour. Arrows move a question only within its own section so section boundaries are preserved; within each section questions are now listed in their actual simulation order.

### Fixed
- Simulations list: the **search box no longer blanks the page and loses focus on every keystroke**. The list now keeps the previous rows visible while the new search/filter result loads (`keepPreviousData`), and the full-page loader only shows on the very first load. Applies to both the admin and collaborator views.
- Simulations list: the **row actions menu (⋮) now opens correctly under the button** instead of being pushed off-screen when the page is scrolled. The menu is `position: fixed`, so its coordinates are computed from the viewport without adding scroll offsets — fixing both the misplacement and the cases where the menu appeared not to open. Applies to the simulation and assignment action menus in both views.
- Simulation detail: the **progressive question number badges are now sequential** within each section. Questions are listed in their actual simulation order (the `order` field) instead of the raw section membership order, so after reordering or deleting questions the numbers no longer appear scrambled/out of sequence.
- Edit simulation: form fields **no longer reset to their previous value** while editing. The form is now populated from the server only once per simulation instead of on every background refetch (e.g. on window focus), which was overwriting in-progress edits as soon as the user moved to the next field.

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
