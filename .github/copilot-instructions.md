# Leonardo School - AI Agent Instructions

## Architecture Overview
**Next.js 16 (App Router)** + **Firebase Auth/Storage** + **PostgreSQL/Prisma** + **tRPC**

### Route Groups Structure
- `app/(marketing)/` → Public pages with Header/Footer (SEO-optimized)
- `app/(app)/` → Protected dashboards: `/admin`, `/studente`, `/collaboratore`
- `app/auth/` → Standalone auth pages (login, register, complete-profile)
- `proxy.ts` → Middleware for auth & role-based routing (NOT middleware.ts)

## Essential Commands
```bash
pnpm dev                 # Start dev server (localhost:3000)
pnpm prisma:generate     # REQUIRED after schema changes
pnpm prisma:migrate      # Run DB migrations
pnpm prisma:studio       # DB GUI (localhost:5555)
```

## Authentication Flow (Critical)
1. Client calls `firebaseAuth.login/register()` from [lib/firebase/auth.ts](lib/firebase/auth.ts)
2. **MUST** call `/api/auth/me` (POST) to sync user to PostgreSQL
3. Server sets cookies: `auth-token` (HttpOnly), `user-role`, `profile-completed`
4. Students/Collaborators redirect to `/auth/complete-profile` if `profileCompleted=false`
5. Account active only when `profileCompleted=true` AND `isActive=true` (admin approval)

## tRPC Patterns
All API logic in [server/trpc/routers/](server/trpc/routers/). Use procedures from [init.ts](server/trpc/init.ts):
```typescript
publicProcedure      // No auth required
protectedProcedure   // Requires authentication  
adminProcedure       // Requires ADMIN role
staffProcedure       // ADMIN or COLLABORATOR
collaboratorProcedure // COLLABORATOR only
```
Register new routers in [server/trpc/routers/index.ts](server/trpc/routers/index.ts).

## Database (Prisma)
Schema: [prisma/schema.prisma](prisma/schema.prisma)
- **UserRole**: `ADMIN`, `COLLABORATOR`, `STUDENT`
- **Subject**: `BIOLOGIA`, `CHIMICA`, `FISICA`, `MATEMATICA`, `LOGICA`, `CULTURA_GENERALE`
- Use `ctx.prisma.$transaction()` for atomic operations

## Color System (MANDATORY)
**NEVER hardcode hex values.** Use [lib/theme/colors.ts](lib/theme/colors.ts):
```typescript
import { colors, getSubjectColor } from '@/lib/theme/colors';

// ✅ Correct
<div className={colors.primary.gradient} />
<div className={getSubjectColor('BIOLOGIA', 'bg')} />

// ❌ Wrong - never do this
<div className="bg-[#D54F8A]" />
```
Categories: `colors.primary.*`, `colors.subjects.*`, `colors.background.*`, `colors.status.*`

## UI/UX Requirements
- **Responsive first**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Dark mode**: Automatic via `colors.ts` - avoid `bg-white`/`text-black`
- **Forms**: Use generous padding (`px-6 sm:px-10 lg:px-16`), group with sections

## Key Files Reference
| Purpose | Location |
|---------|----------|
| Firebase client auth | [lib/firebase/auth.ts](lib/firebase/auth.ts) |
| tRPC procedures | [server/trpc/init.ts](server/trpc/init.ts) |
| Auth sync endpoint | [app/api/auth/me/route.ts](app/api/auth/me/route.ts) |
| Route protection | [proxy.ts](proxy.ts) |
| Color system | [lib/theme/colors.ts](lib/theme/colors.ts) |
| Zod validations | [lib/validations/](lib/validations/) |

## Common Mistakes to Avoid
1. **Missing DB sync**: After Firebase auth, MUST call `/api/auth/me` to create PostgreSQL record
2. **Stale Prisma client**: Run `pnpm prisma:generate` after schema changes
3. **Hardcoded colors**: Always use `colors.ts` exports
4. **Wrong middleware file**: Use `proxy.ts`, NOT `middleware.ts`
5. **Narrow layouts on desktop**: Use `w-full max-w-6xl` with responsive padding

## Environment Variables
Required in `.env.local`:
- `DATABASE_URL` (PostgreSQL, port 5433)
- `NEXT_PUBLIC_FIREBASE_*` (client config)
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string for admin SDK)

## Requirements for all new/edit features, bug fixes, and code generation
- Follow the architecture patterns outlined above
- Ensure proper authentication and role checks
- Use the color system for all UI elements
- Write clear and maintainable code with comments where necessary
- Test thoroughly in both light and dark modes
- Use common components and utilities to avoid duplication, if necessary create new ones
- Validate and sanitize all user inputs to prevent security vulnerabilities
- Use english for code, folders, comments and documentation
- Ensure accessibility standards are met (ARIA roles, keyboard navigation, etc.)
- Pay attention to performance implications of your code
- Pay attention to eslint and prettier rules
- If you use a color check in the file if the color exists in 'lib/theme/colors' if not add it there following the existing patterns
- Use my personal loader components from when data is being fetched or processed, do not use generic "Loading..." texts, my personal loader components are in 'components/ui/loaders'
- If a new api is needed, manage error handling and edge cases properly, if necessary show a friendly error message to the user in Italian
------
description: This file contains instructions for AI code generation specific to the Leonardo School project.

