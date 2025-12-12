// Main tRPC Router - Combines all sub-routers
import { router } from '../init';
import { authRouter } from './auth';
import { studentsRouter } from './students';
import { contractsRouter } from './contracts';
import { materialsRouter } from './materials';
import { collaboratorsRouter } from './collaborators';
import { usersRouter } from './users';
import { jobApplicationsRouter } from './jobApplications';
import { contactRequestsRouter } from './contactRequests';
import { groupsRouter } from './groups';
import { questionsRouter } from './questions';

export const appRouter = router({
  auth: authRouter,
  students: studentsRouter,
  contracts: contractsRouter,
  materials: materialsRouter,
  collaborators: collaboratorsRouter,
  users: usersRouter,
  jobApplications: jobApplicationsRouter,
  contactRequests: contactRequestsRouter,
  groups: groupsRouter,
  questions: questionsRouter,
  // Add more routers here as you build them:
  // simulations: simulationsRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
