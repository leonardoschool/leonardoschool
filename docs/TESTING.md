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
│   ├── trpc/             # tRPC middleware tests
│   ├── utils/            # Utility function tests
│   └── validations/      # Validation function tests
├── integration/          # Integration tests (WIP)
└── e2e/                  # Playwright E2E tests (WIP)
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

Coverage thresholds are currently disabled for a progressive coverage approach. As test coverage grows, thresholds will be incrementally enabled.

## CI/CD

Tests run automatically on:
- Push to `main`, `develop`, or `test` branches
- Pull requests to `main` or `develop`

See `.github/workflows/test.yml` for configuration.

## Current Test Stats

| Category | Tests | Status |
|----------|-------|--------|
| Validations | 106 | ✅ |
| tRPC Middleware | 29 | ✅ |
| Utilities | 81 | ✅ |
| Proxy Middleware | 103 | ✅ |
| UI Components | 51 | ✅ |
| tRPC Routers | 1236 | ✅ |
| **Total** | **1606** | ✅ |

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
