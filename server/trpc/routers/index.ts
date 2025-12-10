// Main tRPC Router - Combines all sub-routers
import { router } from '../init';
import { authRouter } from './auth';
import { studentsRouter } from './students';
import { contractsRouter } from './contracts';
import { materialsRouter } from './materials';
import { collaboratorsRouter } from './collaborators';
import { usersRouter } from './users';

export const appRouter = router({
  auth: authRouter,
  students: studentsRouter,
  contracts: contractsRouter,
  materials: materialsRouter,
  collaborators: collaboratorsRouter,
  users: usersRouter,
  // Add more routers here as you build them:
  // simulations: simulationsRouter,
  // questions: questionsRouter,
  // etc.
});

// Export type definition of API
export type AppRouter = typeof appRouter;
