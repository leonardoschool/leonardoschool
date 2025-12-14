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
import { simulationsRouter } from './simulations';
import { notificationsRouter } from './notifications';
import { questionTagsRouter } from './questionTags';
import { calendarRouter } from './calendar';
import { messagesRouter } from './messages';

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
  simulations: simulationsRouter,
  notifications: notificationsRouter,
  questionTags: questionTagsRouter,
  calendar: calendarRouter,
  messages: messagesRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
