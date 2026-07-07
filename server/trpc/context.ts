// tRPC Context - Shared between all procedures
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@/lib/prisma/client';
import { getAdminAuth } from '@/lib/firebase/admin';
import { User, Student, Admin, Collaborator } from '@prisma/client';
import { initRequestContext, generateRequestId } from '@/lib/utils/requestContext';
import { resolveCapabilitiesForUser } from '@/lib/permissions/resolve';

export async function createContext(opts: FetchCreateContextFnOptions) {
  const { req } = opts;

  // Generate request ID for tracking (similar to Spring Boot's MDC)
  const requestId = generateRequestId();
  
  // Extract request metadata
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Extract Firebase token - try Bearer header first, then cookie fallback
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');
  
  // Fallback to cookie if no Authorization header (for SSR/middleware scenarios)
  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
      token = authTokenMatch?.[1];
    }
  }

  let user: (User & { student?: Student | null; admin?: Admin | null; collaborator?: Collaborator | null }) | null = null;
  let firebaseUid: string | null = null;
  let sessionInvalidated = false;

  if (token) {
    try {
      // Verify Firebase token
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      firebaseUid = decodedToken.uid;

      // Get user from database
      user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: {
          student: true,
          admin: true,
          collaborator: true,
        },
      });

      // Single-device enforcement: gli studenti possono avere una sola sessione attiva.
      // Se il cookie non coincide con il token nel DB, la sessione è stata invalidata
      // da un login su un altro dispositivo.
      if (user?.role === 'STUDENT' && user.activeSessionToken !== null) {
        const cookieHeader = req.headers.get('cookie');
        const match = cookieHeader?.match(/session-device-token=([^;]+)/);
        const clientToken = match?.[1];
        if (!clientToken || clientToken !== user.activeSessionToken) {
          user = null;
          sessionInvalidated = true;
        }
      }

    } catch (error) {
      // Only log authentication errors in production (avoid noise from expired tokens)
      if (process.env.NODE_ENV === 'production') {
        console.error(`[${requestId.slice(0, 8)}] [tRPC] Auth failed:`, {
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      // Don't throw error - just set user to null (procedures will handle UNAUTHORIZED)
    }
  }

  // Resolve the user's capabilities once per request (merges code defaults with DB overrides).
  // Attached to ctx so every procedure/check reads the same immutable set without re-querying.
  // Deactivated (or not-yet-activated) non-admin accounts get NO capabilities: their Firebase
  // token stays valid after an admin deactivates them, and the edge middleware only reads a
  // client-writable cookie — this is the server-side enforcement that actually cuts access.
  // Ungated self-service reads (profile, contract signing, auth.me) keep working so the
  // onboarding/waiting-for-contract flows are unaffected.
  const isDeactivated = user !== null && !user.isActive && user.role !== 'ADMIN';
  const capabilities = isDeactivated ? new Set<string>() : await resolveCapabilitiesForUser(user);

  // Initialize request context for tracking across async operations
  const requestContext = initRequestContext({
    requestId,
    userId: user?.id,
    userRole: user?.role,
    path,
    method,
    ip,
    userAgent,
  });

  return {
    user,
    prisma,
    firebaseUid,
    requestId,
    requestContext,
    sessionInvalidated,
    capabilities,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
