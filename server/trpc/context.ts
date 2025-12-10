// tRPC Context - Shared between all procedures
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@/lib/prisma/client';
import { adminAuth } from '@/lib/firebase/admin';
import { User } from '@prisma/client';

export async function createContext(opts: FetchCreateContextFnOptions) {
  const { req } = opts;

  // Extract Firebase token from Authorization header
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  let user: (User & { student?: any; admin?: any; collaborator?: any }) | null = null;

  if (token) {
    try {
      // Verify Firebase token
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log('[tRPC Context] Firebase UID:', decodedToken.uid);

      // Get user from database
      user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: {
          student: true,
          admin: true,
          collaborator: true,
        },
      });
      
      if (user) {
        console.log('[tRPC Context] User found:', { id: user.id, email: user.email, role: user.role });
      } else {
        console.log('[tRPC Context] No user found in DB for UID:', decodedToken.uid);
      }
    } catch (error) {
      console.error('[tRPC Context] Token verification failed:', error);
      // Don't throw error - just set user to null
    }
  } else {
    console.log('[tRPC Context] No token provided');
  }

  return {
    user,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
