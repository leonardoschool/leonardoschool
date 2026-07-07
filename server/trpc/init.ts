// tRPC Initialization
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { transformer } from '@/lib/trpc/transformer';
import { runWithContext } from '@/lib/utils/requestContext';
import { isValidCapability } from '@/lib/permissions/capabilities';
import { logApp } from '@/lib/logging/appLog';

// Raw exceptions (Prisma, DB drivers, unexpected throws) must never reach the client: they leak
// internals and read as jargon. We detect them and replace the message with a readable Italian one,
// while deliberate TRPCError messages (thrown by our code, already user-facing) pass through untouched.
const TECHNICAL_ERROR_PATTERNS = [
  /Invalid `.*prisma/i,
  /PrismaClient/i,
  /Unknown argument/i,
  /invocation/i,
  /ListStringFieldRefInput|FieldRefInput/i,
];

const GENERIC_SERVER_ERROR_MESSAGE =
  'Si è verificato un errore imprevisto. Riprova; se il problema persiste contatta il supporto.';

function isTechnicalMessage(message: string): boolean {
  return (
    TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message)) ||
    (message.includes('\n') && message.length > 250)
  );
}

const t = initTRPC.context<Context>().create({
  transformer,
  errorFormatter({ shape, error }) {
    // `error.cause` is set when tRPC wrapped an unexpected throw (e.g. a Prisma error).
    // Combined with the technical-message check, this catches raw errors without touching
    // our own TRPCErrors that carry a clean Italian message.
    const isUnexpected = error.cause !== undefined || isTechnicalMessage(shape.message);
    if (shape.data?.code === 'INTERNAL_SERVER_ERROR' && isUnexpected) {
      return {
        ...shape,
        message: GENERIC_SERVER_ERROR_MESSAGE,
      };
    }
    return shape;
  },
});

// Request context middleware - wraps all procedures to maintain request context
const withRequestContext = t.middleware(({ ctx, next }) => {
  // Run the procedure within the request context (like Spring Boot's RequestContextHolder)
  return runWithContext(ctx.requestContext, () => next());
});

// tRPC error codes that represent *expected* client-side outcomes (bad input, missing auth,
// insufficient permissions, not found…). These are not platform faults, so logging them would
// only add noise. Everything else — most importantly INTERNAL_SERVER_ERROR, which tRPC assigns
// to any non-TRPCError throw (Prisma failures, unexpected exceptions) — is a genuine error worth
// persisting for diagnosis.
const EXPECTED_ERROR_CODES = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'PARSE_ERROR',
]);

// Centralized error logging: catches any error bubbling out of a procedure and persists the
// unexpected ones to the application log. Applied to every procedure below, so simulations,
// login, questions, contracts — every API endpoint — is covered without per-router wiring.
const withErrorLogging = t.middleware(async ({ next, path, type }) => {
  const result = await next();
  if (!result.ok) {
    // tRPC's discriminated union doesn't narrow cleanly through the generic here, so read
    // the error off the failed result explicitly.
    const error = (result as { error: TRPCError }).error;
    if (!EXPECTED_ERROR_CODES.has(error.code)) {
      // Await so the write completes before the serverless function may terminate.
      await logApp({
        source: 'TRPC',
        level: 'ERROR',
        message: error.message,
        // `cause` holds the original throw (e.g. the Prisma error) when tRPC wrapped it.
        error: error.cause ?? error,
        path: `${type} ${path}`,
      });
    }
  }
  return result;
});

// Export reusable router and procedure helpers
export const router = t.router;

// Base procedure shared by all: request-context tracking + centralized error logging.
const baseProcedure = t.procedure.use(withRequestContext).use(withErrorLogging);

// All procedures now include request context tracking
export const publicProcedure = baseProcedure;

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: ctx.sessionInvalidated ? 'SESSIONE_TERMINATA' : 'Not authenticated',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Admin middleware
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Collaborator middleware
const isCollaborator = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'COLLABORATOR') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Collaborator access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Staff middleware (Admin OR Collaborator)
const isStaff = t.middleware(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== 'ADMIN' && ctx.user.role !== 'COLLABORATOR')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Staff access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Student middleware
const isStudent = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'STUDENT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Student access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// All protected procedures include request context tracking + error logging + auth
export const protectedProcedure = baseProcedure.use(isAuthed);
export const adminProcedure = baseProcedure.use(isAdmin);
export const collaboratorProcedure = baseProcedure.use(isCollaborator);
export const staffProcedure = baseProcedure.use(isStaff); // Admin OR Collaborator
export const studentProcedure = baseProcedure.use(isStudent);

// ==================== Capabilities ====================
// Fine-grained, admin-configurable permissions layered on top of the role wrappers above.
// ADMIN always passes (fixed super-user) so it can never be locked out.

// Fail fast on typo'd capability keys during development, before they cause a silent
// (and dangerous) fail-open/fail-closed at runtime.
function assertKnownCapability(capability: string): void {
  if (process.env.NODE_ENV !== 'production' && !isValidCapability(capability)) {
    throw new Error(`Unknown capability "${capability}" — not in the catalog (lib/permissions/capabilities.ts)`);
  }
}

/** Whether the current request's user holds a capability. Admin bypasses the matrix. */
export function hasCapability(ctx: Context, capability: string): boolean {
  assertKnownCapability(capability);
  return ctx.user?.role === 'ADMIN' || ctx.capabilities.has(capability);
}

/** Throw FORBIDDEN unless the current user holds the capability. Use inside procedures. */
export function assertCapability(ctx: Context, capability: string): void {
  if (!hasCapability(ctx, capability)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Non hai i permessi necessari per eseguire questa azione.',
    });
  }
}

// NOTE: there is deliberately no capability-only procedure wrapper. A capability check without
// a role wrapper would let a matrix toggle grant an endpoint across roles (e.g. ticking a staff
// capability for STUDENT would open a staff endpoint to students). Always pair a role procedure
// (staffProcedure/studentProcedure/...) with assertCapability() inside the handler.
