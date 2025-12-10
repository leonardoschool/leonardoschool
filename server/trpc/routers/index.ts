// Main tRPC Router - Combines all sub-routers
import { router } from '../init';
import { authRouter } from './auth';
import { studentsRouter } from './students';
import { contractsRouter } from './contracts';

export const appRouter = router({
  auth: authRouter,
  students: studentsRouter,
  contracts: contractsRouter,
  // Add more routers here as you build them:
  // simulations: simulationsRouter,
  // questions: questionsRouter,
  // etc.
});

// Export type definition of API
export type AppRouter = typeof appRouter;
