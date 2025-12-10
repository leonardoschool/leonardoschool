# Leonardo School - AI Agent Instructions

## Architecture Overview

This is a **Next.js 16 (App Router)** application for university admission test preparation, using a **hybrid architecture**:
- **Firebase Auth + Storage** for authentication and file management
- **PostgreSQL + Prisma** for all structured data (questions, simulations, results, stats)
- **tRPC** for type-safe API layer between frontend and backend

### Key Structural Pattern: Route Groups
The app uses Next.js route groups to separate concerns:
- `app/(marketing)/` - Public marketing site (SEO-optimized, with Header/Footer from layout)
- `app/(app)/` - Private application area (student/admin dashboards, protected by middleware)
- `app/auth/` - Standalone auth pages (minimal layout)

**Homepage is at** `app/(marketing)/page.tsx` (re-exports from `app/_homepage.tsx`)

## Authentication Flow

1. **Client** uses `lib/firebase/auth.ts` helpers (e.g., `firebaseAuth.login()`)
2. **Firebase** returns JWT token
3. **All tRPC calls** automatically attach token via `lib/trpc/Provider.tsx` headers
4. **Server** (`server/trpc/context.ts`) verifies token with Firebase Admin and loads user from PostgreSQL
5. User metadata (role, profile) lives in **PostgreSQL**, not Firebase

**Critical**: User records have `firebaseUid` linking to Firebase Auth, but all app data is in Prisma.

## Database Schema (Prisma)

Located at `prisma/schema.prisma`. Key models:
- **User** (firebaseUid, role: ADMIN|STUDENT) → links to Student or Admin profile
- **Question** (subject, difficulty, answers, correctAnswer)
- **Simulation** (test configuration, timing, scoring rules)
- **SimulationResult** (student answers, scores, ranking)
- **StudentStats** (aggregated performance metrics)

**Enum values** (important for filters/queries):
- Subject: `BIOLOGIA`, `CHIMICA`, `FISICA`, `MATEMATICA`, `LOGICA`, `CULTURA_GENERALE`
- UserRole: `ADMIN`, `STUDENT`
- SimulationType: `FULL_TEST`, `SUBJECT_TEST`, `CUSTOM_TEST`, `QUICK_QUIZ`

## tRPC Patterns

All API logic goes in `server/trpc/routers/`. Structure:
```typescript
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../init';

export const exampleRouter = router({
  publicEndpoint: publicProcedure.query(...),
  userEndpoint: protectedProcedure.query(...),    // Requires auth
  adminEndpoint: adminProcedure.mutation(...),    // Requires ADMIN role
});
```

**Add new routers** to `server/trpc/routers/index.ts` (merge into `appRouter`).

**Client usage** (in components):
```typescript
'use client';
import { trpc } from '@/lib/trpc/client';

const { data, isLoading } = trpc.auth.me.useQuery();
const mutation = trpc.students.update.useMutation();
```

## Development Workflows

### Setup Database
```bash
pnpm prisma:generate   # Generate Prisma client
pnpm prisma:migrate    # Run migrations
pnpm prisma:studio     # Open DB GUI
```

### Dev Server
```bash
pnpm dev               # Starts on localhost:3000
```

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- Firebase credentials (NEXT_PUBLIC_FIREBASE_*)
- Firebase Admin service account (FIREBASE_SERVICE_ACCOUNT_KEY as JSON string)
- PostgreSQL connection (DATABASE_URL)

## File Organization Conventions

### Components
- `components/layout/` - Header, Footer, Sidebar (shared layouts)
- `components/ui/` - Reusable UI primitives (Button, Card, Input)
- `components/student/` - Student-specific features
- `components/admin/` - Admin-specific features

### Libraries
- `lib/firebase/` - Firebase client & admin SDK wrappers
- `lib/prisma/` - Prisma client singleton
- `lib/trpc/` - tRPC client & React Query provider
- `lib/hooks/` - Custom React hooks
- `lib/stores/` - Zustand state management
- `lib/validations/` - Zod schemas for form validation
- `lib/theme/` - Design system (colors, typography, spacing)

### Server Code
- `server/trpc/routers/` - tRPC route handlers (business logic)
- `server/services/` - Reusable service layer (email, stats calculations, etc.)

## Critical Integration Points

### Firebase Storage Upload Pattern
Use `lib/firebase/storage.ts` helpers:
```typescript
const { url, path } = await firebaseStorage.uploadQuestionImage(file);
// Store `url` in PostgreSQL question.imageUrl field
```

### Prisma Transactions
For atomic operations (e.g., submitting test results):
```typescript
await ctx.prisma.$transaction(async (tx) => {
  await tx.simulationResult.create(...);
  await tx.studentStats.update(...);
});
```

### Role-Based Access
- Use `protectedProcedure` for any authenticated endpoint
- Use `adminProcedure` for admin-only operations
- Client-side route protection via `proxy.ts` (Next.js 16 convention)

### Color System (IMPORTANT)
**ALWAYS use the centralized color system** from `lib/theme/colors.ts` instead of hardcoding hex values:

```typescript
import { colors, getSubjectColor } from '@/lib/theme/colors';

// ✅ Correct - Use color constants
<div className={colors.subjects.matematica.bg} />
<h1 className={colors.primary.gradient} />

// ✅ Dynamic subject colors
<div className={getSubjectColor('BIOLOGIA', 'bg')} />

// ❌ Wrong - Don't hardcode hex values
<div className="bg-[#D54F8A]" />
```

**Available color categories:**
- `colors.primary.*` - Brand colors (rosso bordeaux Leonardo School)
- `colors.subjects.*` - Subject-specific colors (matematica, biologia, chimica, fisica, logica, culturaGenerale)
- `colors.neutral.*` - Gray scale and neutral UI colors
- `colors.effects.*` - Shadows, hovers, interactive states
- `colors.status.*` - Success, warning, error, info states

See `lib/theme/colors.ts` for full documentation.

## Testing & Debugging

**No formal test suite yet.** Manual testing workflow:
1. Use `pnpm prisma:studio` to inspect/modify DB state
2. Check browser Network tab for tRPC calls (endpoint: `/api/trpc`)
3. Firebase Auth errors logged to console in `server/trpc/context.ts`

## Future Expansion (Planned)

- **Expo mobile app** will share tRPC routers and Prisma types
- **Redis caching** for ranking/statistics (when needed)
- **Background jobs** (BullMQ) for heavy computations

## Common Pitfalls

1. **Forgetting to sync Firebase user**: After Firebase registration, MUST call `trpc.auth.syncUser.mutate()` to create DB record
2. **Prisma not generated**: Run `pnpm prisma:generate` after schema changes
3. **Missing Firebase token**: Ensure `TRPCProvider` wraps app in `layout.tsx`
4. **Route group confusion**: Public pages go in `(marketing)`, private in `(app)`, auth is standalone
5. **Hardcoding colors**: ALWAYS use `lib/theme/colors.ts` instead of inline hex values (e.g., `bg-[#D54F8A]`)
6. **Proxy vs Middleware**: Use `proxy.ts` not `middleware.ts` (Next.js 16 convention)

## Examples from Codebase

- **tRPC router**: `server/trpc/routers/auth.ts` (sync Firebase user to DB)
- **Firebase auth wrapper**: `lib/firebase/auth.ts` (login, register, logout helpers)
- **Prisma usage**: `server/trpc/context.ts` (fetch user by firebaseUid)
- **Route group layout**: `app/(marketing)/layout.tsx` (wraps with Header/Footer)
