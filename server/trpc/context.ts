// tRPC Context - Shared between all procedures
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@/lib/prisma/client';
import { getAdminAuth } from '@/lib/firebase/admin';
import { User, Student, Admin, Collaborator } from '@prisma/client';
import { initRequestContext, generateRequestId } from '@/lib/utils/requestContext';

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
    requestId, // Expose request ID to procedures
    requestContext, // Expose full context for async tracking
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
