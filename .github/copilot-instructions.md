# Leonardo School - AI Agent Instructions

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
pnpm prisma:generate     # REQUIRED after schema changes
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
- **Subject**: Custom subjects from database (`CustomSubject` model with dynamic colors)
- Use `ctx.prisma.$transaction()` for atomic operations

## Color System (MANDATORY)
**NEVER hardcode hex values.** Use [lib/theme/colors.ts](lib/theme/colors.ts):
```typescript
import { colors, generateDynamicSubjectColor } from '@/lib/theme/colors';

// ✅ Correct - Brand colors
<div className={colors.primary.gradient} />

// ✅ Correct - Dynamic subject colors from database
const subjectColors = generateDynamicSubjectColor(subject.color);
<div style={{ backgroundColor: subjectColors.main }} />

// ❌ Wrong - never hardcode subject colors
<div className="bg-[#D54F8A]" />
```
Categories: `colors.primary.*`, `colors.background.*`, `colors.status.*`
Subject colors: Use `generateDynamicSubjectColor(hexColor)` with color from database

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
Required in `.env`:
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
- Pay attention to the colors in both light and dark mode

### Loader Components
- Use loader components from `components/ui/loaders` - never use generic "Loading..." texts or custom spinners
- Available loaders: `Spinner` (xs/sm/md/lg/xl sizes, primary/white/muted variants), `PageLoader`, `ButtonLoader`, `DotsLoader`, `Skeleton`, `SkeletonCard`, `SkeletonTable`
- For buttons with loading states, wrap content with `<ButtonLoader loading={isLoading} loadingText="Testo...">Children</ButtonLoader>`
- For full-page loading states (loading.tsx files), use `<PageLoader />`

### Error Handling & Toast Notifications
- For tRPC mutations, always add `onError: handleMutationError` using the `useApiError` hook from `lib/hooks/useApiError`
- For success feedback, use `showSuccess(title, message)` from the `useToast` hook in `components/ui/Toast`
- Use `parseError()` from `lib/utils/errorHandler` to convert technical errors to user-friendly Italian messages
- All user-facing error/success messages must be in Italian
- Example pattern for mutations:
  ```typescript
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  const mutation = trpc.example.action.useMutation({
    onSuccess: () => {
      showSuccess('Titolo', 'Messaggio di successo.');
    },
    onError: handleMutationError,
  });
  ```

### Form Validations
- Use existing validation functions from `lib/validations/`:
  - `isValidEmail()` from `authValidation.ts` for email validation
  - `calculatePasswordStrength()` from `authValidation.ts` for password strength
  - Profile validations (codice fiscale, telefono, CAP, etc.) from `profileValidation.ts`
- Use `normalizeName()` from `lib/utils/stringUtils` for user names
- Use `sanitizeHtml()` from `lib/utils/sanitizeHtml` for HTML content

### tRPC Procedures
- Register new routers in `server/trpc/routers/index.ts`
- Use appropriate procedures from `server/trpc/init.ts`:
  - `publicProcedure` - No auth required
  - `protectedProcedure` - Requires authentication
  - `adminProcedure` - Requires ADMIN role
  - `staffProcedure` - ADMIN or COLLABORATOR
  - `collaboratorProcedure` - COLLABORATOR only
------
description: This file contains instructions for AI code generation specific to the Leonardo School project.

