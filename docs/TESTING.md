# Leonardo School - Testing Guide

> Comprehensive testing documentation for the Leonardo School webapp

## Overview

This project uses a modern testing stack to ensure code quality, security, and reliability:

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Test runner (fast, Vite-native) | 4.0.17 |
| **Testing Library** | Component testing | 16.3.2 |
| **Playwright** | E2E testing | 1.57.0 |
| **MSW** | API mocking | 2.12.7 |
| **Faker** | Test data generation | 10.2.0 |

## Quick Start

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e
```

## Project Structure

```
tests/
├── setup.ts              # Global test setup
├── utils.tsx             # Test utilities and helpers
├── mocks/
│   ├── index.ts          # Mock exports
│   ├── firebase.ts       # Firebase Auth mock
│   └── prisma.ts         # Prisma Client mock
├── unit/
│   ├── components/       # UI component tests
│   ├── middleware/       # Proxy/auth middleware tests
│   ├── trpc/             # tRPC middleware and router tests
│   ├── utils/            # Utility function tests
│   └── validations/      # Validation function tests
├── integration/          # Integration tests (WIP)
└── e2e/                  # Playwright E2E tests
    ├── homepage.spec.ts      # Homepage tests
    ├── auth.spec.ts          # Login page tests
    ├── registration.spec.ts  # Registration tests
    ├── contact.spec.ts       # Contact form tests
    ├── job-application.spec.ts # Lavora con noi tests
    ├── chi-siamo.spec.ts     # About us page tests
    ├── didattica.spec.ts     # Teaching page tests
    ├── simulazione.spec.ts   # Simulation page tests
    ├── termini.spec.ts       # Terms and conditions tests
    ├── navigation.spec.ts    # Site navigation tests
    ├── seo.spec.ts           # SEO and meta tags tests
    ├── accessibility.spec.ts # WCAG accessibility tests
    └── performance.spec.ts   # Performance tests
```

## Test Categories

### 1. Unit Tests (Validations)

Tests for input validation functions used throughout the app.

**Files:**
- `tests/unit/validations/authValidation.test.ts` - Email validation, password strength
- `tests/unit/validations/profileValidation.test.ts` - Italian profile data (codice fiscale, CAP, provincia, etc.)

**Run:**
```bash
pnpm test:run tests/unit/validations/
```

### 2. Unit Tests (tRPC Middleware)

Tests for authentication and authorization middleware.

**File:** `tests/unit/trpc/middleware.test.ts`

**Coverage:**
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authentication
- `adminProcedure` - ADMIN role only
- `collaboratorProcedure` - COLLABORATOR role only
- `staffProcedure` - ADMIN or COLLABORATOR
- `studentProcedure` - STUDENT role only
- Security edge cases (role escalation, null/undefined roles)

**Run:**
```bash
pnpm test:run tests/unit/trpc/
```

### 3. Unit Tests (Proxy Middleware)

Tests for route protection and role-based access control.

**File:** `tests/unit/middleware/proxy.test.ts`

**Coverage:**
- `hasAccess()` - Role-based route access
- `isUnifiedProtectedRoute()` - Protected route detection
- Security scenarios (role escalation, path traversal, case sensitivity)
- PAGE_PERMISSIONS completeness

**Run:**
```bash
pnpm test:run tests/unit/middleware/
```

### 4. Unit Tests (Utilities)

Tests for utility functions.

**Files:**
- `tests/unit/utils/errorHandler.test.ts` - Error parsing, Italian translations
- `tests/unit/utils/stringUtils.test.ts` - Name/email normalization

**Run:**
```bash
pnpm test:run tests/unit/utils/
```

### 5. Component Tests

Tests for React components using Testing Library.

**File:** `tests/unit/components/loaders.test.tsx`

**Coverage:**
- `Spinner` - Sizes, variants, accessibility
- `ButtonLoader` - Loading states, text display
- `PageLoader` - Variants, sizes, fullScreen mode
- `DotsLoader` - Rendering, sizes
- `Skeleton`, `SkeletonCard`, `SkeletonTable` - Animations, accessibility

**Run:**
```bash
pnpm test:run tests/unit/components/
```

## Writing Tests

### Naming Conventions

```typescript
// File naming: <module>.test.ts or <module>.test.tsx
authValidation.test.ts
loaders.test.tsx

// Test structure
describe('Module', () => {
  describe('function/component', () => {
    describe('category', () => {
      it('should do something specific', () => {
        // Test
      });
    });
  });
});
```

### Test Data

Use the test utilities from `tests/utils.tsx`:

```typescript
import { generateEmail, generateCodiceFiscale, generatePhoneNumber } from '@tests/utils';

const email = generateEmail(); // random@test.com
const cf = generateCodiceFiscale(); // Valid Italian fiscal code
const phone = generatePhoneNumber(); // +39 3XX XXX XXXX
```

### Mocking Firebase

```typescript
import { mockFirebaseUser, mockHelpers } from '@tests/mocks/firebase';

// Create a mock user
const user = mockFirebaseUser({
  uid: 'test-uid',
  email: 'test@example.com',
});

// Simulate auth error
mockHelpers.simulateAuthError('auth/user-not-found');
```

### Mocking Prisma

```typescript
import { prismaMock, createMockUser } from '@tests/mocks/prisma';

// Create mock data
const user = createMockUser({ role: 'ADMIN' });

// Mock Prisma query
prismaMock.user.findUnique.mockResolvedValue(user);
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole('button', { name: /click me/i }));
  
  expect(handleClick).toHaveBeenCalled();
});
```

## Coverage

Run coverage report:

```bash
pnpm test:coverage
```

### Coverage Thresholds (ACTIVE)

| Metric | Threshold | Current |
|--------|-----------|---------|
| Lines | 80% | **98.39%** ✅ |
| Branches | 75% | **95.85%** ✅ |
| Functions | 80% | **100%** ✅ |
| Statements | 80% | **98.53%** ✅ |

Coverage is enforced in CI/CD pipeline. Pull requests must meet thresholds to merge.

### Excluded from Coverage

The following files are excluded from coverage metrics (require runtime/external services):
- `lib/firebase/**` - Firebase SDK (requires auth connection)
- `lib/prisma/**` - Prisma Client (requires database)
- `lib/hooks/**` - React hooks (require component context)
- `lib/cache/**`, `lib/email/**`, `lib/notifications/**` - External services
- `lib/utils/contractPdf.ts`, `lib/utils/simulationPdfGenerator.ts` - PDF generation
- `lib/utils/matricolaUtils.ts` - Requires Prisma for generateMatricola

## CI/CD

Tests run automatically on:
- Push to `main`, `develop`, or `test` branches
- Pull requests to `main` or `develop`

See `.github/workflows/test.yml` for configuration.

## Current Test Stats

| Category | Tests | Status |
|----------|-------|--------|
| tRPC Routers | 1606 | ✅ |
| Validations | 555 | ✅ |
| Utilities | 290 | ✅ |
| UI Components | 162 | ✅ |
| Theme & Permissions | 45 | ✅ |
| **Unit Total** | **2636** | ✅ |
| E2E Tests | ~150 | ✅ |

> Last updated: January 2026

### Validation Tests Breakdown

| File | Tests | Coverage |
|------|-------|----------|
| authValidation.test.ts | 42 | Email, password strength |
| profileValidation.test.ts | 120+ | Italian profile data (CF, CAP, provincia, parent/guardian) |
| fileValidation.test.ts | ~80 | File uploads, MIME types, security |
| simulationValidation.test.ts | 180+ | All Zod schemas, helper functions, type guards, presets |
| questionValidation.test.ts | ~78 | Question schemas, answers, keywords |
| formValidation.test.ts | ~66 | Contact form, sanitization |
| notificationValidation.test.ts | ~20 | Notification schemas |
| questionTagValidation.test.ts | ~35 | Tag/category schemas |

### Utility Tests Breakdown

| File | Tests | Coverage |
|------|-------|----------|
| errorHandler.test.ts | 49 | tRPC error parsing, Italian translations |
| stringUtils.test.ts | 32 | Name/email normalization |
| sanitizeHtml.test.ts | 85 | XSS prevention, dangerous tags, event handlers |
| escapeHtml.test.ts | 54 | HTML entity escaping, sanitizeText |
| codiceFiscaleCalculator.test.ts | ~80 | Italian fiscal code calculation |
| simulationLabels.test.ts | ~20 | Simulation label generation |

### Theme & Core Tests Breakdown

| File | Tests | Coverage |
|------|-------|----------|
| colors.test.ts | 20+ | Dynamic subject colors, color system |
| permissions.test.ts | 15+ | Role-based access, navigation items |
| constants.test.ts | 10+ | Site constants, configuration |
| codiceFiscaleCalculator.test.ts | 48 | Italian fiscal code algorithm |
| matricolaUtils.test.ts | 41 | Student enrollment numbers |
| simulationLabels.test.ts | 35 | Simulation type labels and colors |

### UI Component Tests Breakdown

| File | Tests | Coverage |
|------|-------|----------|
| Spinner.test.tsx | 18 | Sizes, variants, accessibility |
| ButtonLoader.test.tsx | 15 | Loading states, text display |
| Button.test.tsx | 32 | Variants, sizes, disabled, interactions |
| Input.test.tsx | 38 | States, errors, types, accessibility |
| Toast.test.tsx | 35 | Notifications, auto-dismiss, stacking |
| loaders.test.tsx | 24 | PageLoader, DotsLoader, Skeleton |

### tRPC Router Tests Breakdown

| Router | Tests | Description |
|--------|-------|-------------|
| Auth | 30 | syncUser, me, updateLastLogin |
| Users | 43 | getAll, changeRole, toggleActive, deleteUser |
| Simulations | 47 | CRUD, assignments, attempts |
| Students | 77 | Profile, stats, parent/guardian management |
| Contracts | 90 | Templates, workflow, signing |
| Groups | 66 | CRUD, member management, stats |
| Materials | 94 | Categories, subjects, topics, subtopics, access control |
| Notifications | 83 | CRUD, preferences, read status, batch operations |
| Messages | 109 | Conversations, send/receive, archive, read status |
| Calendar | 105 | Events, invitations, attendances, staff absences |
| Questions | 71 | CRUD, bulk operations, import/export, tags, stats |
| Collaborators | 92 | Profile, permissions, convert from student |
| Contact Requests | 73 | CRUD, status workflow, admin notes |
| Job Applications | 67 | CRUD, status workflow, CV management |
| Question Tags | 100 | Categories, tags, assignments, bulk operations |
| Virtual Room | 89 | Session management, cheating detection, real-time |

### E2E Tests Breakdown

| File | Tests | Coverage |
|------|-------|----------|
| homepage.spec.ts | ~15 | Metadata, hero, services, responsive |
| auth.spec.ts | ~12 | Login form, validation, password toggle |
| registration.spec.ts | ~16 | Registration form, validation, terms |
| contact.spec.ts | ~16 | Contact form, validation, submission |
| job-application.spec.ts | ~12 | Job application form, CV upload |
| chi-siamo.spec.ts | ~10 | About page content, accessibility |
| didattica.spec.ts | ~10 | Teaching page, navigation |
| simulazione.spec.ts | ~10 | Simulation page, features |
| termini.spec.ts | ~10 | Terms content, navigation |
| navigation.spec.ts | ~20 | Header, footer, mobile menu |
| seo.spec.ts | ~25 | Meta tags, OG, robots, sitemap |
| accessibility.spec.ts | ~25 | ARIA, keyboard, landmarks, contrast |
| performance.spec.ts | ~18 | Load time, resources, caching |

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **One assertion per test when possible** - Makes failures easier to diagnose
3. **Use descriptive test names** - Should read like a sentence
4. **Avoid testing third-party code** - Focus on your own logic
5. **Keep tests fast** - Mock external dependencies
6. **Test edge cases** - Empty inputs, null values, boundary conditions
7. **Test security scenarios** - Role escalation, unauthorized access

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
pnpm install
```

### Tests fail with Prisma errors
```bash
pnpm prisma:generate
```

### Tests timeout
Increase timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000,
}
```

### Component tests fail with hydration errors
Make sure you're using `'use client'` directive for client components.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)
- [MSW](https://mswjs.io/)
