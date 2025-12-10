// Main tRPC Router - Combines all sub-routers
import { router } from '../init';
import { authRouter } from './auth';
import { studentsRouter } from './students';

export const appRouter = router({
  auth: authRouter,
  students: studentsRouter,
  // Add more routers here as you build them:
  // simulations: simulationsRouter,
  // questions: questionsRouter,
  // etc.
});

// Export type definition of API
export type AppRouter = typeof appRouter;
