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

  let user: (User & { student?: any; admin?: any }) | null = null;

  if (token) {
    try {
      // Verify Firebase token
      const decodedToken = await adminAuth.verifyIdToken(token);

      // Get user from database
      user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: {
          student: true,
          admin: true,
        },
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      // Don't throw error - just set user to null
    }
  }

  return {
    user,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
