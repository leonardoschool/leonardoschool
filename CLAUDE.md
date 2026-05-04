# Leonardo School — Claude Code Instructions

## Architecture Overview
**Next.js 16 (App Router)** + **Firebase Auth/Storage** + **PostgreSQL/Prisma** + **tRPC**

### Route Groups Structure
- `app/(marketing)/` → Public pages with Header/Footer (SEO-optimized)
- `app/(app)/` → Protected pages with unified routes (role-based content via components)
- `app/auth/` → Standalone auth pages (login, register, complete-profile)
- `proxy.ts` → Middleware for auth & role-based routing (NOT middleware.ts)

## Essential Commands
```bash
pnpm dev                 # Start dev server (localhost:3000)
pnpm tsc --noEmit        # TypeScript check (run after every refactor)
pnpm prisma:generate     # REQUIRED after schema changes
pnpm prisma:studio       # DB GUI (localhost:5555)
```

## Authentication Flow
1. Client calls `firebaseAuth.login/register()` from `lib/firebase/auth.ts`
2. MUST call `/api/auth/me` (POST) to sync user to PostgreSQL
3. Server sets cookies: `auth-token` (HttpOnly), `user-role`, `profile-completed`
4. Students/Collaborators redirect to `/auth/complete-profile` if `profileCompleted=false`
5. Account active only when `profileCompleted=true` AND `isActive=true` (admin approval)

## tRPC Patterns
All API logic in `server/trpc/routers/`. Use procedures from `server/trpc/init.ts`:
- `publicProcedure` — No auth required
- `protectedProcedure` — Requires authentication
- `adminProcedure` — Requires ADMIN role
- `staffProcedure` — ADMIN or COLLABORATOR
- `collaboratorProcedure` — COLLABORATOR only

Register new routers in `server/trpc/routers/index.ts`.

## Database (Prisma)
Schema: `prisma/schema.prisma`
- **UserRole**: `ADMIN`, `COLLABORATOR`, `STUDENT`
- Use `ctx.prisma.$transaction()` for atomic operations
- Run `pnpm prisma:generate` after every schema change

## Color System (MANDATORY)
Never hardcode hex values. Use `lib/theme/colors.ts`:
```typescript
import { colors } from '@/lib/theme/colors';
<div className={colors.primary.gradient} />  // brand colors
```
For dynamic subject colors: `generateDynamicSubjectColor(subject.color)`.

## Code Quality & Complexity Standards (2026)

### Complexity Limits
- Max cyclomatic complexity per function/component: **15**
- Max lines per component file: **400** (excluding tests)
- Max lines per tRPC router file: **500** — split into co-located `[router].helpers.ts`
- Max `useState` hooks per component: **8** — extract to custom hook if exceeded
- Max `useMemo`/`useCallback` per component: **5**

### Component Decomposition Rules
- Every render branch with >50 lines → extract to named sub-component
- Every stateful logic block reused 2+ times → extract to custom hook in `lib/hooks/`
- Every pure computation >10 lines used in multiple places → extract to `lib/utils/`
- Modal/form content → always in dedicated file (e.g., `XxxFormModal.tsx`)
- tRPC business logic >20 lines → extract to `[router].helpers.ts` co-located file

### Custom Hook Guidelines
- Hooks managing tRPC queries + mutations for a feature → `use[Feature]Data.ts`
- Hooks managing UI state for a complex component → `use[Component]State.ts`
- Place in `lib/hooks/` (project-wide) or co-located if component-specific
- Helper functions in `*.helpers.ts` must be pure (no side effects), unit-testable

### File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Helpers: `camelCase.helpers.ts`
- Types: `camelCase.types.ts`

### Modern React Patterns (2026)
- Use `useOptimistic` for optimistic UI updates instead of manual state rollback
- Use `startTransition` to wrap non-urgent state updates
- Avoid prop drilling beyond 2 levels — use context or composition
- `useMemo` only when profiling shows actual perf issue, not preemptively

## Claude-Specific Rules
- When reducing complexity, extract pure helpers first, then hooks, then sub-components
- Keep public APIs unchanged: tRPC procedure names, component props, hook return shapes
- Run `pnpm tsc --noEmit` after every file change — zero errors required
- Never add new npm packages without explicit user approval
- Prefer editing existing files over creating new ones
- Do not add comments explaining WHAT the code does; only add WHY when non-obvious
- All user-facing messages must be in Italian
- Error handling: always use `onError: handleMutationError` from `useApiError` hook

## Common Mistakes to Avoid
1. Missing DB sync: after Firebase auth, always call `/api/auth/me`
2. Stale Prisma client: run `pnpm prisma:generate` after schema changes
3. Hardcoded colors: always use `colors.ts` exports
4. Wrong middleware file: use `proxy.ts`, NOT `middleware.ts`
5. Hardcoded Italian strings in English code: messages to users stay in Italian
