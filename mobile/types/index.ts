/**
 * Leonardo School Mobile - Types
 * 
 * Tipi TypeScript condivisi per l'app mobile.
 * 
 * NOTA IMPORTANTE: Le materie sono ora dinamiche e provengono dal database.
 * Usare CustomSubject invece di Subject per le nuove implementazioni.
 * Subject è mantenuto per retrocompatibilità ma è deprecato.
 */

// ==================== USER & AUTH ====================

export type UserRole = 'ADMIN' | 'COLLABORATOR' | 'STUDENT';

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  profileCompleted: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  // Onboarding fields (from /api/auth/me)
  pendingContractToken?: string | null;
  parentDataRequired?: boolean;
}

export interface StudentProfile {
  id: string;
  userId: string;
  matricola?: string;
  fiscalCode?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  enrollmentDate: string;
  graduationYear?: number;
}

export interface AuthState {
  user: User | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: string | null;
}

// ==================== SUBJECTS ====================

/**
 * CustomSubject - Tipo per materie dinamiche dal database
 * Le materie sono create da admin/collaboratori con colori personalizzati
 */
export interface CustomSubject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  color?: string | null; // Colore HEX scelto dall'admin (es. "#FF5733")
  icon?: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated Usare CustomSubject. Le materie sono ora dinamiche.
 */
export type Subject = 
  | 'BIOLOGIA'
  | 'CHIMICA'
  | 'FISICA'
  | 'MATEMATICA'
  | 'LOGICA'
  | 'CULTURA_GENERALE';

/**
 * @deprecated Usare subject.name dal database
 */
export const SUBJECT_NAMES: Record<Subject, string> = {
  BIOLOGIA: 'Biologia',
  CHIMICA: 'Chimica',
  FISICA: 'Fisica',
  MATEMATICA: 'Matematica',
  LOGICA: 'Logica',
  CULTURA_GENERALE: 'Cultura Generale',
};

// ==================== QUESTIONS ====================

export type QuestionType = 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'OPEN_TEXT';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  explanation?: string;
  subject: Subject;
  difficulty: DifficultyLevel;
  type: QuestionType;
  imageUrl?: string;
  answers: QuestionAnswer[];
  points: number;
}

// ==================== SIMULATIONS ====================

export type SimulationType = 'OFFICIAL' | 'PRACTICE' | 'CUSTOM' | 'QUICK_QUIZ';
export type SimulationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

export interface Simulation {
  id: string;
  title: string;
  description?: string;
  type: SimulationType;
  status: SimulationStatus;
  isOfficial: boolean;
  durationMinutes: number;
  totalQuestions: number;
  passingScore?: number;
  sections: SimulationSection[];
  createdAt: string;
}

export interface SimulationAssignment {
  id: string;
  simulationId: string;
  simulation: Simulation;
  startDate?: string;
  endDate?: string;
  maxAttempts?: number;
  attemptsUsed: number;
  isCompleted: boolean;
}

export interface SimulationAnswer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

export interface SimulationResult {
  id: string;
  simulationId: string;
  simulation: Simulation;
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  timeSpent: number;
  completedAt: string;
  sectionResults?: SectionResult[];
}

export interface SectionResult {
  sectionName: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
}

// ==================== STATISTICS ====================

export interface StudentStats {
  totalSimulations: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTimeSpent: number; // in minutes
  subjectStats: SubjectStats[];
  recentResults: SimulationResult[];
  progressTrend: ProgressPoint[];
}

export interface SubjectStats {
  subject: Subject;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ProgressPoint {
  date: string;
  score: number;
  simulationTitle: string;
}

// ==================== MATERIALS ====================

export interface Material {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface MaterialCategory {
  id: string;
  name: string;
  description?: string;
  materials: Material[];
}

// ==================== CALENDAR ====================

export type EventType = 'LESSON' | 'SIMULATION' | 'MEETING' | 'EXAM' | 'OTHER';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location?: string;
  meetingLink?: string;
}

// ==================== NOTIFICATIONS ====================

export type NotificationType =
  | 'ACCOUNT_ACTIVATED'
  | 'CONTRACT_ASSIGNED'
  | 'CONTRACT_SIGNED'
  | 'CONTRACT_REMINDER'
  | 'EVENT_INVITATION'
  | 'EVENT_REMINDER'
  | 'SIMULATION_ASSIGNED'
  | 'SIMULATION_REMINDER'
  | 'SIMULATION_RESULTS'
  | 'MATERIAL_AVAILABLE'
  | 'MESSAGE_RECEIVED'
  | 'GENERAL';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ==================== MESSAGES ====================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId: string;
  userName: string;
  role: UserRole;
}

// ==================== NAVIGATION ====================

export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'simulation/[id]': { id: string };
  'simulation/result/[id]': { id: string };
  'material/[id]': { id: string };
  'event/[id]': { id: string };
  'settings': undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'verify-email': undefined;
  'complete-profile': undefined;
};

export type TabParamList = {
  index: undefined;
  simulations: undefined;
  statistics: undefined;
  materials: undefined;
  profile: undefined;
};
