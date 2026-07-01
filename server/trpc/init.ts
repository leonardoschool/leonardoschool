// tRPC Initialization
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { transformer } from '@/lib/trpc/transformer';
import { runWithContext } from '@/lib/utils/requestContext';

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

// Export reusable router and procedure helpers
export const router = t.router;

// All procedures now include request context tracking
export const publicProcedure = t.procedure.use(withRequestContext);

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

// All protected procedures include request context tracking + auth
export const protectedProcedure = t.procedure.use(withRequestContext).use(isAuthed);
export const adminProcedure = t.procedure.use(withRequestContext).use(isAdmin);
export const collaboratorProcedure = t.procedure.use(withRequestContext).use(isCollaborator);
export const staffProcedure = t.procedure.use(withRequestContext).use(isStaff); // Admin OR Collaborator
export const studentProcedure = t.procedure.use(withRequestContext).use(isStudent);
