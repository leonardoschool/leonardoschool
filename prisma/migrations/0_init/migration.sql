-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLLABORATOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'OPEN_TEXT');

-- CreateEnum
CREATE TYPE "QuestionLanguage" AS ENUM ('IT', 'EN');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpenAnswerValidationType" AS ENUM ('MANUAL', 'KEYWORDS', 'BOTH');

-- CreateEnum
CREATE TYPE "QuestionFeedbackType" AS ENUM ('ERROR_IN_QUESTION', 'ERROR_IN_ANSWER', 'UNCLEAR', 'SUGGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionFeedbackStatus" AS ENUM ('PENDING', 'REVIEWED', 'FIXED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SimulationType" AS ENUM ('OFFICIAL', 'PRACTICE', 'CUSTOM', 'QUICK_QUIZ');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SimulationVisibility" AS ENUM ('PRIVATE', 'GROUP', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SimulationSessionStatus" AS ENUM ('WAITING', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SimulationAccessType" AS ENUM ('OPEN', 'ROOM');

-- CreateEnum
CREATE TYPE "CheatingEventType" AS ENUM ('TAB_CHANGE', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'PAGE_RELOAD', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'RIGHT_CLICK', 'DEVTOOLS_OPEN', 'SCREENSHOT_ATTEMPT', 'KEYBOARD_SHORTCUT', 'MULTIPLE_MONITORS', 'DISCONNECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionMessageSender" AS ENUM ('ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED', 'CANCELLED', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT_ACTIVATED', 'NEW_REGISTRATION', 'PROFILE_COMPLETED', 'PARENT_DATA_REQUESTED', 'CONTRACT_ASSIGNED', 'CONTRACT_SIGNED', 'CONTRACT_REMINDER', 'CONTRACT_EXPIRED', 'CONTRACT_CANCELLED', 'EVENT_INVITATION', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED', 'SIMULATION_ASSIGNED', 'SIMULATION_REMINDER', 'SIMULATION_READY', 'SIMULATION_STARTED', 'SIMULATION_RESULTS', 'SIMULATION_COMPLETED', 'STAFF_ABSENCE', 'ABSENCE_REQUEST', 'ABSENCE_CONFIRMED', 'ABSENCE_REJECTED', 'SUBSTITUTION_ASSIGNED', 'QUESTION_FEEDBACK', 'OPEN_ANSWER_TO_REVIEW', 'MATERIAL_AVAILABLE', 'GROUP_MEMBER_ADDED', 'GROUP_REFERENT_ASSIGNED', 'MESSAGE_RECEIVED', 'JOB_APPLICATION', 'CONTACT_REQUEST', 'ATTENDANCE_RECORDED', 'SYSTEM_ALERT', 'GENERAL');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LESSON', 'SIMULATION', 'MEETING', 'EXAM', 'OTHER');

-- CreateEnum
CREATE TYPE "EventLocationType" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "StaffAbsenceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "CollaboratorKind" AS ENUM ('TUTOR', 'SECRETARY');

-- CreateEnum
CREATE TYPE "ContractTargetRole" AS ENUM ('STUDENT', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'VIDEO', 'LINK', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MaterialVisibility" AS ENUM ('NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('PENDING', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('STUDENTS', 'COLLABORATORS', 'MIXED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "activeSessionToken" TEXT,
    "expoPushToken" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matricola" TEXT,
    "fiscalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "birthPlace" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graduationYear" INTEGER,
    "requiresParentData" BOOLEAN NOT NULL DEFAULT false,
    "parentDataRequestedAt" TIMESTAMP(3),
    "parentDataRequestedById" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_guardians" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fiscalCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageTests" BOOLEAN NOT NULL DEFAULT true,
    "canViewStats" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CollaboratorKind" NOT NULL DEFAULT 'TUTOR',
    "fiscalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "birthPlace" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "canManageQuestions" BOOLEAN NOT NULL DEFAULT true,
    "canManageMaterials" BOOLEAN NOT NULL DEFAULT true,
    "canViewStats" BOOLEAN NOT NULL DEFAULT true,
    "canViewStudents" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specialization" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "text" TEXT NOT NULL,
    "textLatex" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageStoragePath" TEXT,
    "imageFileName" TEXT,
    "imageFileSize" INTEGER,
    "imageMimeType" TEXT,
    "imageAlt" TEXT,
    "subjectId" TEXT,
    "topicId" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "negativePoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "blankPoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "timeLimitSeconds" INTEGER,
    "correctExplanation" TEXT,
    "wrongExplanation" TEXT,
    "generalExplanation" TEXT,
    "explanationVideoUrl" TEXT,
    "explanationPdfUrl" TEXT,
    "openValidationType" "OpenAnswerValidationType",
    "openMinLength" INTEGER,
    "openMaxLength" INTEGER,
    "openCaseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "openPartialMatch" BOOLEAN NOT NULL DEFAULT true,
    "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "showExplanation" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "year" INTEGER,
    "source" TEXT,
    "externalId" TEXT,
    "language" "QuestionLanguage" NOT NULL DEFAULT 'IT',
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "timesAnswered" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "timesSkipped" INTEGER NOT NULL DEFAULT 0,
    "avgTimeSeconds" DOUBLE PRECISION,
    "avgCorrectRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_tag_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "question_tag_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_tag_assignments" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "question_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textLatex" TEXT,
    "imageUrl" TEXT,
    "imageStoragePath" TEXT,
    "imageFileName" TEXT,
    "imageFileSize" INTEGER,
    "imageMimeType" TEXT,
    "imageAlt" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "timesSelected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_keywords" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSuggested" BOOLEAN NOT NULL DEFAULT false,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "exactMatch" BOOLEAN NOT NULL DEFAULT false,
    "synonyms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "question_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_feedbacks" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "QuestionFeedbackType" NOT NULL,
    "status" "QuestionFeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "adminResponse" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_favorites" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeReason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_answer_submissions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "simulationResultId" TEXT,
    "answerText" TEXT NOT NULL,
    "keywordsMatched" TEXT[],
    "keywordsMissed" TEXT[],
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatorNotes" TEXT,
    "finalScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "open_answer_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SimulationType" NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "SimulationVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdById" TEXT,
    "creatorRole" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "accessType" "SimulationAccessType" NOT NULL DEFAULT 'OPEN',
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "calendarEventId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "openAnswerReviewerId" TEXT,
    "allowReview" BOOLEAN NOT NULL DEFAULT true,
    "randomizeOrder" BOOLEAN NOT NULL DEFAULT false,
    "randomizeAnswers" BOOLEAN NOT NULL DEFAULT false,
    "useQuestionPoints" BOOLEAN NOT NULL DEFAULT false,
    "correctPoints" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "wrongPoints" DOUBLE PRECISION NOT NULL DEFAULT -0.4,
    "blankPoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxScore" DOUBLE PRECISION,
    "passingScore" DOUBLE PRECISION,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER,
    "isPaperBased" BOOLEAN NOT NULL DEFAULT false,
    "paperInstructions" TEXT,
    "showSectionsInPaper" BOOLEAN NOT NULL DEFAULT true,
    "trackAttendance" BOOLEAN NOT NULL DEFAULT false,
    "locationType" TEXT,
    "locationDetails" TEXT,
    "hasSections" BOOLEAN NOT NULL DEFAULT false,
    "sections" JSONB,
    "enableAntiCheat" BOOLEAN NOT NULL DEFAULT false,
    "forceFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "blockTabChange" BOOLEAN NOT NULL DEFAULT false,
    "blockCopyPaste" BOOLEAN NOT NULL DEFAULT false,
    "logSuspiciousEvents" BOOLEAN NOT NULL DEFAULT false,
    "subjectDistribution" JSONB,
    "difficultyDistribution" JSONB,
    "topicIds" JSONB,
    "sourceTemplateId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SimulationType" NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "creatorRole" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "allowReview" BOOLEAN NOT NULL DEFAULT true,
    "randomizeOrder" BOOLEAN NOT NULL DEFAULT false,
    "randomizeAnswers" BOOLEAN NOT NULL DEFAULT false,
    "useQuestionPoints" BOOLEAN NOT NULL DEFAULT false,
    "correctPoints" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "wrongPoints" DOUBLE PRECISION NOT NULL DEFAULT -0.4,
    "blankPoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxScore" DOUBLE PRECISION,
    "passingScore" DOUBLE PRECISION,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "maxAttempts" INTEGER,
    "isPaperBased" BOOLEAN NOT NULL DEFAULT false,
    "paperInstructions" TEXT,
    "showSectionsInPaper" BOOLEAN NOT NULL DEFAULT true,
    "trackAttendance" BOOLEAN NOT NULL DEFAULT false,
    "locationType" TEXT,
    "locationDetails" TEXT,
    "hasSections" BOOLEAN NOT NULL DEFAULT true,
    "sections" JSONB,
    "isSelfPracticeTemplate" BOOLEAN NOT NULL DEFAULT false,
    "enableAntiCheat" BOOLEAN NOT NULL DEFAULT false,
    "forceFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "blockTabChange" BOOLEAN NOT NULL DEFAULT false,
    "blockCopyPaste" BOOLEAN NOT NULL DEFAULT false,
    "logSuspiciousEvents" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_template_assignments" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studentId" TEXT,
    "groupId" TEXT,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_assignments" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "studentId" TEXT,
    "groupId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "locationType" TEXT,
    "createCalendarEvent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "simulation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_questions" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "customPoints" DOUBLE PRECISION,
    "customNegativePoints" DOUBLE PRECISION,

    CONSTRAINT "simulation_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_results" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "blankAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "percentageScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pendingOpenAnswers" INTEGER NOT NULL DEFAULT 0,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "answers" JSONB NOT NULL,
    "subjectScores" JSONB,
    "rankPosition" INTEGER,
    "totalParticipants" INTEGER,

    CONSTRAINT "simulation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_sessions" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "status" "SimulationSessionStatus" NOT NULL DEFAULT 'WAITING',
    "scheduledStartAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "startedById" TEXT,
    "waitingMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "isKicked" BOOLEAN NOT NULL DEFAULT false,
    "kickedAt" TIMESTAMP(3),
    "kickedReason" TEXT,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "resultId" TEXT,
    "anonymousId" TEXT NOT NULL,

    CONSTRAINT "simulation_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_cheating_events" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventType" "CheatingEventType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_cheating_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_messages" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "senderType" "SessionMessageSender" NOT NULL,
    "senderId" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_stats" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalSimulations" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bestScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "subjectStats" JSONB,
    "totalStudyTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "avgSimulationTime" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "linkText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "locationType" "EventLocationType" NOT NULL DEFAULT 'IN_PERSON',
    "locationDetails" TEXT,
    "onlineLink" TEXT,
    "createdById" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sendEmailInvites" BOOLEAN NOT NULL DEFAULT false,
    "sendEmailReminders" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" "RecurrenceFrequency",
    "recurrenceEndDate" TIMESTAMP(3),
    "parentEventId" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "tagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_invitations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "status" "EventInviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "responseNote" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_status_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "attendance_status_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "customStatusId" TEXT,
    "notes" TEXT,
    "arrivalTime" TIMESTAMP(3),
    "leaveTime" TIMESTAMP(3),
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedById" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_absences" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "affectedEventId" TEXT,
    "status" "StaffAbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "substituteId" TEXT,
    "substituteConfirmedAt" TIMESTAMP(3),
    "studentsNotified" BOOLEAN NOT NULL DEFAULT false,
    "studentsNotifiedAt" TIMESTAMP(3),
    "emailsSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "duration" TEXT,
    "targetRole" "ContractTargetRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "collaboratorId" TEXT,
    "templateId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING',
    "contentSnapshot" TEXT NOT NULL,
    "priceSnapshot" DOUBLE PRECISION,
    "signedAt" TIMESTAMP(3),
    "signatureData" TEXT,
    "signatureIp" TEXT,
    "signatureUserAgent" TEXT,
    "signToken" TEXT NOT NULL,
    "signTokenExpiresAt" TIMESTAMP(3),
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "contractExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeNotes" TEXT,
    "adminNotes" TEXT,
    "assignedBy" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "studentId" TEXT,
    "collaboratorId" TEXT,
    "contractId" TEXT,
    "readBy" JSONB NOT NULL DEFAULT '{}',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "leftAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    "lastReadMsgId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentSize" INTEGER,
    "attachmentMimeType" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "iconUrl" TEXT,
    "linkUrl" TEXT,
    "linkType" TEXT,
    "linkEntityType" TEXT,
    "linkEntityId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "groupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "MaterialVisibility" NOT NULL DEFAULT 'ALL_STUDENTS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_category_group_access" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "material_category_group_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_category_student_access" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "material_category_student_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_category_links" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_category_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasEnglishQuestions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaterialType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "externalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" "MaterialVisibility" NOT NULL DEFAULT 'ALL_STUDENTS',
    "subjectId" TEXT,
    "topicId" TEXT,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_group_access" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "material_group_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_student_access" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "material_student_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "cvUrl" TEXT,
    "cvFileName" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "collaboratorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "readAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_subjects" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'MIXED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "referenceStudentId" TEXT,
    "referenceCollaboratorId" TEXT,
    "referenceAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_student_references" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_student_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_collaborator_references" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_collaborator_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_admin_references" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_admin_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT,
    "collaboratorId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_activeSessionToken_key" ON "users"("activeSessionToken");

-- CreateIndex
CREATE INDEX "users_firebaseUid_idx" ON "users"("firebaseUid");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_userId_idx" ON "fcm_tokens"("userId");

-- CreateIndex
CREATE INDEX "fcm_tokens_token_idx" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_isActive_idx" ON "fcm_tokens"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_matricola_key" ON "students"("matricola");

-- CreateIndex
CREATE UNIQUE INDEX "students_fiscalCode_key" ON "students"("fiscalCode");

-- CreateIndex
CREATE INDEX "students_userId_idx" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_guardians_studentId_key" ON "parent_guardians"("studentId");

-- CreateIndex
CREATE INDEX "parent_guardians_studentId_idx" ON "parent_guardians"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE INDEX "admins_userId_idx" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_userId_key" ON "collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_fiscalCode_key" ON "collaborators"("fiscalCode");

-- CreateIndex
CREATE INDEX "collaborators_userId_idx" ON "collaborators"("userId");

-- CreateIndex
CREATE INDEX "questions_subjectId_idx" ON "questions"("subjectId");

-- CreateIndex
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "questions_year_idx" ON "questions"("year");

-- CreateIndex
CREATE INDEX "questions_language_idx" ON "questions"("language");

-- CreateIndex
CREATE INDEX "questions_createdById_idx" ON "questions"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "question_tag_categories_name_key" ON "question_tag_categories"("name");

-- CreateIndex
CREATE INDEX "question_tag_categories_isActive_idx" ON "question_tag_categories"("isActive");

-- CreateIndex
CREATE INDEX "question_tag_categories_order_idx" ON "question_tag_categories"("order");

-- CreateIndex
CREATE INDEX "question_tags_categoryId_idx" ON "question_tags"("categoryId");

-- CreateIndex
CREATE INDEX "question_tags_isActive_idx" ON "question_tags"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "question_tags_categoryId_name_key" ON "question_tags"("categoryId", "name");

-- CreateIndex
CREATE INDEX "question_tag_assignments_questionId_idx" ON "question_tag_assignments"("questionId");

-- CreateIndex
CREATE INDEX "question_tag_assignments_tagId_idx" ON "question_tag_assignments"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "question_tag_assignments_questionId_tagId_key" ON "question_tag_assignments"("questionId", "tagId");

-- CreateIndex
CREATE INDEX "question_answers_questionId_idx" ON "question_answers"("questionId");

-- CreateIndex
CREATE INDEX "question_answers_isCorrect_idx" ON "question_answers"("isCorrect");

-- CreateIndex
CREATE INDEX "question_keywords_questionId_idx" ON "question_keywords"("questionId");

-- CreateIndex
CREATE INDEX "question_feedbacks_questionId_idx" ON "question_feedbacks"("questionId");

-- CreateIndex
CREATE INDEX "question_feedbacks_studentId_idx" ON "question_feedbacks"("studentId");

-- CreateIndex
CREATE INDEX "question_feedbacks_status_idx" ON "question_feedbacks"("status");

-- CreateIndex
CREATE INDEX "question_feedbacks_type_idx" ON "question_feedbacks"("type");

-- CreateIndex
CREATE INDEX "question_favorites_studentId_idx" ON "question_favorites"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "question_favorites_questionId_studentId_key" ON "question_favorites"("questionId", "studentId");

-- CreateIndex
CREATE INDEX "question_versions_questionId_idx" ON "question_versions"("questionId");

-- CreateIndex
CREATE INDEX "question_versions_changedAt_idx" ON "question_versions"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_questionId_version_key" ON "question_versions"("questionId", "version");

-- CreateIndex
CREATE INDEX "open_answer_submissions_questionId_idx" ON "open_answer_submissions"("questionId");

-- CreateIndex
CREATE INDEX "open_answer_submissions_studentId_idx" ON "open_answer_submissions"("studentId");

-- CreateIndex
CREATE INDEX "open_answer_submissions_isValidated_idx" ON "open_answer_submissions"("isValidated");

-- CreateIndex
CREATE INDEX "open_answer_submissions_simulationResultId_idx" ON "open_answer_submissions"("simulationResultId");

-- CreateIndex
CREATE UNIQUE INDEX "simulations_calendarEventId_key" ON "simulations"("calendarEventId");

-- CreateIndex
CREATE INDEX "simulations_status_idx" ON "simulations"("status");

-- CreateIndex
CREATE INDEX "simulations_startDate_idx" ON "simulations"("startDate");

-- CreateIndex
CREATE INDEX "simulations_endDate_idx" ON "simulations"("endDate");

-- CreateIndex
CREATE INDEX "simulations_isPublic_idx" ON "simulations"("isPublic");

-- CreateIndex
CREATE INDEX "simulations_createdById_idx" ON "simulations"("createdById");

-- CreateIndex
CREATE INDEX "simulations_visibility_idx" ON "simulations"("visibility");

-- CreateIndex
CREATE INDEX "simulations_isOfficial_idx" ON "simulations"("isOfficial");

-- CreateIndex
CREATE INDEX "simulations_openAnswerReviewerId_idx" ON "simulations"("openAnswerReviewerId");

-- CreateIndex
CREATE INDEX "simulations_accessType_idx" ON "simulations"("accessType");

-- CreateIndex
CREATE INDEX "simulations_isScheduled_idx" ON "simulations"("isScheduled");

-- CreateIndex
CREATE INDEX "simulations_isPaperBased_idx" ON "simulations"("isPaperBased");

-- CreateIndex
CREATE INDEX "simulations_hasSections_idx" ON "simulations"("hasSections");

-- CreateIndex
CREATE INDEX "simulations_sourceTemplateId_idx" ON "simulations"("sourceTemplateId");

-- CreateIndex
CREATE INDEX "simulation_templates_status_idx" ON "simulation_templates"("status");

-- CreateIndex
CREATE INDEX "simulation_templates_type_idx" ON "simulation_templates"("type");

-- CreateIndex
CREATE INDEX "simulation_templates_createdById_idx" ON "simulation_templates"("createdById");

-- CreateIndex
CREATE INDEX "simulation_templates_isSelfPracticeTemplate_idx" ON "simulation_templates"("isSelfPracticeTemplate");

-- CreateIndex
CREATE INDEX "simulation_template_assignments_templateId_idx" ON "simulation_template_assignments"("templateId");

-- CreateIndex
CREATE INDEX "simulation_template_assignments_studentId_idx" ON "simulation_template_assignments"("studentId");

-- CreateIndex
CREATE INDEX "simulation_template_assignments_groupId_idx" ON "simulation_template_assignments"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_template_assignments_templateId_studentId_key" ON "simulation_template_assignments"("templateId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_template_assignments_templateId_groupId_key" ON "simulation_template_assignments"("templateId", "groupId");

-- CreateIndex
CREATE INDEX "simulation_assignments_simulationId_idx" ON "simulation_assignments"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_assignments_studentId_idx" ON "simulation_assignments"("studentId");

-- CreateIndex
CREATE INDEX "simulation_assignments_groupId_idx" ON "simulation_assignments"("groupId");

-- CreateIndex
CREATE INDEX "simulation_assignments_startDate_idx" ON "simulation_assignments"("startDate");

-- CreateIndex
CREATE INDEX "simulation_assignments_endDate_idx" ON "simulation_assignments"("endDate");

-- CreateIndex
CREATE INDEX "simulation_assignments_status_idx" ON "simulation_assignments"("status");

-- CreateIndex
CREATE INDEX "simulation_assignments_simulationId_studentId_idx" ON "simulation_assignments"("simulationId", "studentId");

-- CreateIndex
CREATE INDEX "simulation_assignments_simulationId_groupId_idx" ON "simulation_assignments"("simulationId", "groupId");

-- CreateIndex
CREATE INDEX "simulation_questions_simulationId_idx" ON "simulation_questions"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_questions_questionId_idx" ON "simulation_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_questions_simulationId_questionId_key" ON "simulation_questions"("simulationId", "questionId");

-- CreateIndex
CREATE INDEX "simulation_results_studentId_idx" ON "simulation_results"("studentId");

-- CreateIndex
CREATE INDEX "simulation_results_simulationId_idx" ON "simulation_results"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_results_assignmentId_idx" ON "simulation_results"("assignmentId");

-- CreateIndex
CREATE INDEX "simulation_results_totalScore_idx" ON "simulation_results"("totalScore");

-- CreateIndex
CREATE INDEX "simulation_results_completedAt_idx" ON "simulation_results"("completedAt");

-- CreateIndex
CREATE INDEX "simulation_results_pendingOpenAnswers_idx" ON "simulation_results"("pendingOpenAnswers");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_results_simulationId_studentId_assignmentId_key" ON "simulation_results"("simulationId", "studentId", "assignmentId");

-- CreateIndex
CREATE INDEX "simulation_sessions_simulationId_idx" ON "simulation_sessions"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_sessions_assignmentId_idx" ON "simulation_sessions"("assignmentId");

-- CreateIndex
CREATE INDEX "simulation_sessions_status_idx" ON "simulation_sessions"("status");

-- CreateIndex
CREATE INDEX "simulation_sessions_scheduledStartAt_idx" ON "simulation_sessions"("scheduledStartAt");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_session_participants_resultId_key" ON "simulation_session_participants"("resultId");

-- CreateIndex
CREATE INDEX "simulation_session_participants_sessionId_idx" ON "simulation_session_participants"("sessionId");

-- CreateIndex
CREATE INDEX "simulation_session_participants_studentId_idx" ON "simulation_session_participants"("studentId");

-- CreateIndex
CREATE INDEX "simulation_session_participants_isConnected_idx" ON "simulation_session_participants"("isConnected");

-- CreateIndex
CREATE INDEX "simulation_session_participants_sessionId_isConnected_idx" ON "simulation_session_participants"("sessionId", "isConnected");

-- CreateIndex
CREATE INDEX "simulation_session_participants_lastHeartbeat_idx" ON "simulation_session_participants"("lastHeartbeat");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_session_participants_sessionId_studentId_key" ON "simulation_session_participants"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "session_cheating_events_participantId_idx" ON "session_cheating_events"("participantId");

-- CreateIndex
CREATE INDEX "session_cheating_events_eventType_idx" ON "session_cheating_events"("eventType");

-- CreateIndex
CREATE INDEX "session_cheating_events_createdAt_idx" ON "session_cheating_events"("createdAt");

-- CreateIndex
CREATE INDEX "session_messages_participantId_idx" ON "session_messages"("participantId");

-- CreateIndex
CREATE INDEX "session_messages_senderType_idx" ON "session_messages"("senderType");

-- CreateIndex
CREATE INDEX "session_messages_isRead_idx" ON "session_messages"("isRead");

-- CreateIndex
CREATE INDEX "session_messages_createdAt_idx" ON "session_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "student_stats_studentId_key" ON "student_stats"("studentId");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_isRead_idx" ON "alerts"("isRead");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_isPublic_idx" ON "events"("isPublic");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "calendar_events"("type");

-- CreateIndex
CREATE INDEX "calendar_events_startDate_idx" ON "calendar_events"("startDate");

-- CreateIndex
CREATE INDEX "calendar_events_endDate_idx" ON "calendar_events"("endDate");

-- CreateIndex
CREATE INDEX "calendar_events_createdById_idx" ON "calendar_events"("createdById");

-- CreateIndex
CREATE INDEX "calendar_events_isPublic_idx" ON "calendar_events"("isPublic");

-- CreateIndex
CREATE INDEX "calendar_events_isCancelled_idx" ON "calendar_events"("isCancelled");

-- CreateIndex
CREATE INDEX "calendar_events_parentEventId_idx" ON "calendar_events"("parentEventId");

-- CreateIndex
CREATE INDEX "calendar_events_tagId_idx" ON "calendar_events"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_tags_name_key" ON "calendar_event_tags"("name");

-- CreateIndex
CREATE INDEX "calendar_event_tags_isActive_idx" ON "calendar_event_tags"("isActive");

-- CreateIndex
CREATE INDEX "event_invitations_eventId_idx" ON "event_invitations"("eventId");

-- CreateIndex
CREATE INDEX "event_invitations_userId_idx" ON "event_invitations"("userId");

-- CreateIndex
CREATE INDEX "event_invitations_groupId_idx" ON "event_invitations"("groupId");

-- CreateIndex
CREATE INDEX "event_invitations_status_idx" ON "event_invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_invitations_eventId_userId_key" ON "event_invitations"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_invitations_eventId_groupId_key" ON "event_invitations"("eventId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_status_types_name_key" ON "attendance_status_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_status_types_code_key" ON "attendance_status_types"("code");

-- CreateIndex
CREATE INDEX "attendance_status_types_isActive_idx" ON "attendance_status_types"("isActive");

-- CreateIndex
CREATE INDEX "attendances_eventId_idx" ON "attendances"("eventId");

-- CreateIndex
CREATE INDEX "attendances_studentId_idx" ON "attendances"("studentId");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE INDEX "attendances_recordedById_idx" ON "attendances"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_eventId_studentId_key" ON "attendances"("eventId", "studentId");

-- CreateIndex
CREATE INDEX "staff_absences_requesterId_idx" ON "staff_absences"("requesterId");

-- CreateIndex
CREATE INDEX "staff_absences_status_idx" ON "staff_absences"("status");

-- CreateIndex
CREATE INDEX "staff_absences_startDate_idx" ON "staff_absences"("startDate");

-- CreateIndex
CREATE INDEX "staff_absences_endDate_idx" ON "staff_absences"("endDate");

-- CreateIndex
CREATE INDEX "staff_absences_substituteId_idx" ON "staff_absences"("substituteId");

-- CreateIndex
CREATE INDEX "staff_absences_affectedEventId_idx" ON "staff_absences"("affectedEventId");

-- CreateIndex
CREATE INDEX "contract_templates_isActive_idx" ON "contract_templates"("isActive");

-- CreateIndex
CREATE INDEX "contract_templates_targetRole_idx" ON "contract_templates"("targetRole");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_signToken_key" ON "contracts"("signToken");

-- CreateIndex
CREATE INDEX "contracts_studentId_idx" ON "contracts"("studentId");

-- CreateIndex
CREATE INDEX "contracts_collaboratorId_idx" ON "contracts"("collaboratorId");

-- CreateIndex
CREATE INDEX "contracts_templateId_idx" ON "contracts"("templateId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_signToken_idx" ON "contracts"("signToken");

-- CreateIndex
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");

-- CreateIndex
CREATE INDEX "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "admin_notifications_isUrgent_idx" ON "admin_notifications"("isUrgent");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_isArchived_idx" ON "conversations"("isArchived");

-- CreateIndex
CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE INDEX "conversation_participants_lastReadAt_idx" ON "conversation_participants"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_isUrgent_idx" ON "notifications"("isUrgent");

-- CreateIndex
CREATE INDEX "notifications_isArchived_idx" ON "notifications"("isArchived");

-- CreateIndex
CREATE INDEX "notifications_groupKey_idx" ON "notifications"("groupKey");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_isArchived_isRead_idx" ON "notifications"("userId", "isArchived", "isRead");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_notificationType_key" ON "notification_preferences"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "material_categories_isActive_idx" ON "material_categories"("isActive");

-- CreateIndex
CREATE INDEX "material_categories_order_idx" ON "material_categories"("order");

-- CreateIndex
CREATE INDEX "material_categories_visibility_idx" ON "material_categories"("visibility");

-- CreateIndex
CREATE INDEX "material_category_group_access_categoryId_idx" ON "material_category_group_access"("categoryId");

-- CreateIndex
CREATE INDEX "material_category_group_access_groupId_idx" ON "material_category_group_access"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "material_category_group_access_categoryId_groupId_key" ON "material_category_group_access"("categoryId", "groupId");

-- CreateIndex
CREATE INDEX "material_category_student_access_categoryId_idx" ON "material_category_student_access"("categoryId");

-- CreateIndex
CREATE INDEX "material_category_student_access_studentId_idx" ON "material_category_student_access"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "material_category_student_access_categoryId_studentId_key" ON "material_category_student_access"("categoryId", "studentId");

-- CreateIndex
CREATE INDEX "material_category_links_materialId_idx" ON "material_category_links"("materialId");

-- CreateIndex
CREATE INDEX "material_category_links_categoryId_idx" ON "material_category_links"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "material_category_links_materialId_categoryId_key" ON "material_category_links"("materialId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_subjects_name_key" ON "custom_subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "custom_subjects_code_key" ON "custom_subjects"("code");

-- CreateIndex
CREATE INDEX "custom_subjects_isActive_idx" ON "custom_subjects"("isActive");

-- CreateIndex
CREATE INDEX "custom_subjects_order_idx" ON "custom_subjects"("order");

-- CreateIndex
CREATE INDEX "topics_subjectId_idx" ON "topics"("subjectId");

-- CreateIndex
CREATE INDEX "topics_isActive_idx" ON "topics"("isActive");

-- CreateIndex
CREATE INDEX "topics_order_idx" ON "topics"("order");

-- CreateIndex
CREATE UNIQUE INDEX "topics_subjectId_name_key" ON "topics"("subjectId", "name");

-- CreateIndex
CREATE INDEX "materials_type_idx" ON "materials"("type");

-- CreateIndex
CREATE INDEX "materials_visibility_idx" ON "materials"("visibility");

-- CreateIndex
CREATE INDEX "materials_subjectId_idx" ON "materials"("subjectId");

-- CreateIndex
CREATE INDEX "materials_topicId_idx" ON "materials"("topicId");

-- CreateIndex
CREATE INDEX "materials_isActive_idx" ON "materials"("isActive");

-- CreateIndex
CREATE INDEX "material_group_access_materialId_idx" ON "material_group_access"("materialId");

-- CreateIndex
CREATE INDEX "material_group_access_groupId_idx" ON "material_group_access"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "material_group_access_materialId_groupId_key" ON "material_group_access"("materialId", "groupId");

-- CreateIndex
CREATE INDEX "material_student_access_materialId_idx" ON "material_student_access"("materialId");

-- CreateIndex
CREATE INDEX "material_student_access_studentId_idx" ON "material_student_access"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "material_student_access_materialId_studentId_key" ON "material_student_access"("materialId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_collaboratorId_key" ON "job_applications"("collaboratorId");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "job_applications_createdAt_idx" ON "job_applications"("createdAt");

-- CreateIndex
CREATE INDEX "job_applications_email_idx" ON "job_applications"("email");

-- CreateIndex
CREATE INDEX "contact_requests_status_idx" ON "contact_requests"("status");

-- CreateIndex
CREATE INDEX "contact_requests_createdAt_idx" ON "contact_requests"("createdAt");

-- CreateIndex
CREATE INDEX "contact_requests_email_idx" ON "contact_requests"("email");

-- CreateIndex
CREATE INDEX "collaborator_subjects_collaboratorId_idx" ON "collaborator_subjects"("collaboratorId");

-- CreateIndex
CREATE INDEX "collaborator_subjects_subjectId_idx" ON "collaborator_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_subjects_collaboratorId_subjectId_key" ON "collaborator_subjects"("collaboratorId", "subjectId");

-- CreateIndex
CREATE INDEX "groups_type_idx" ON "groups"("type");

-- CreateIndex
CREATE INDEX "groups_isActive_idx" ON "groups"("isActive");

-- CreateIndex
CREATE INDEX "group_student_references_groupId_idx" ON "group_student_references"("groupId");

-- CreateIndex
CREATE INDEX "group_student_references_studentId_idx" ON "group_student_references"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "group_student_references_groupId_studentId_key" ON "group_student_references"("groupId", "studentId");

-- CreateIndex
CREATE INDEX "group_collaborator_references_groupId_idx" ON "group_collaborator_references"("groupId");

-- CreateIndex
CREATE INDEX "group_collaborator_references_collaboratorId_idx" ON "group_collaborator_references"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "group_collaborator_references_groupId_collaboratorId_key" ON "group_collaborator_references"("groupId", "collaboratorId");

-- CreateIndex
CREATE INDEX "group_admin_references_groupId_idx" ON "group_admin_references"("groupId");

-- CreateIndex
CREATE INDEX "group_admin_references_adminId_idx" ON "group_admin_references"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "group_admin_references_groupId_adminId_key" ON "group_admin_references"("groupId", "adminId");

-- CreateIndex
CREATE INDEX "group_members_groupId_idx" ON "group_members"("groupId");

-- CreateIndex
CREATE INDEX "group_members_studentId_idx" ON "group_members"("studentId");

-- CreateIndex
CREATE INDEX "group_members_collaboratorId_idx" ON "group_members"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_studentId_key" ON "group_members"("groupId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_collaboratorId_key" ON "group_members"("groupId", "collaboratorId");

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_guardians" ADD CONSTRAINT "parent_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "custom_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "question_tag_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tag_assignments" ADD CONSTRAINT "question_tag_assignments_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tag_assignments" ADD CONSTRAINT "question_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "question_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_keywords" ADD CONSTRAINT "question_keywords_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_feedbacks" ADD CONSTRAINT "question_feedbacks_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_feedbacks" ADD CONSTRAINT "question_feedbacks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_favorites" ADD CONSTRAINT "question_favorites_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_favorites" ADD CONSTRAINT "question_favorites_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_answer_submissions" ADD CONSTRAINT "open_answer_submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_answer_submissions" ADD CONSTRAINT "open_answer_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_answer_submissions" ADD CONSTRAINT "open_answer_submissions_simulationResultId_fkey" FOREIGN KEY ("simulationResultId") REFERENCES "simulation_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "simulation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_templates" ADD CONSTRAINT "simulation_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_template_assignments" ADD CONSTRAINT "simulation_template_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "simulation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_template_assignments" ADD CONSTRAINT "simulation_template_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_template_assignments" ADD CONSTRAINT "simulation_template_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_assignments" ADD CONSTRAINT "simulation_assignments_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_assignments" ADD CONSTRAINT "simulation_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_assignments" ADD CONSTRAINT "simulation_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_assignments" ADD CONSTRAINT "simulation_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "simulation_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "simulation_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_session_participants" ADD CONSTRAINT "simulation_session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_session_participants" ADD CONSTRAINT "simulation_session_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_session_participants" ADD CONSTRAINT "simulation_session_participants_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "simulation_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_cheating_events" ADD CONSTRAINT "session_cheating_events_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "simulation_session_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "simulation_session_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_stats" ADD CONSTRAINT "student_stats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "calendar_event_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "attendance_status_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absences" ADD CONSTRAINT "staff_absences_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absences" ADD CONSTRAINT "staff_absences_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absences" ADD CONSTRAINT "staff_absences_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_absences" ADD CONSTRAINT "staff_absences_affectedEventId_fkey" FOREIGN KEY ("affectedEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_group_access" ADD CONSTRAINT "material_category_group_access_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_group_access" ADD CONSTRAINT "material_category_group_access_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_student_access" ADD CONSTRAINT "material_category_student_access_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_student_access" ADD CONSTRAINT "material_category_student_access_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_links" ADD CONSTRAINT "material_category_links_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_category_links" ADD CONSTRAINT "material_category_links_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "custom_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "custom_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_group_access" ADD CONSTRAINT "material_group_access_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_group_access" ADD CONSTRAINT "material_group_access_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_student_access" ADD CONSTRAINT "material_student_access_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_student_access" ADD CONSTRAINT "material_student_access_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_subjects" ADD CONSTRAINT "collaborator_subjects_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_subjects" ADD CONSTRAINT "collaborator_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "custom_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_referenceStudentId_fkey" FOREIGN KEY ("referenceStudentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_referenceCollaboratorId_fkey" FOREIGN KEY ("referenceCollaboratorId") REFERENCES "collaborators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_referenceAdminId_fkey" FOREIGN KEY ("referenceAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_student_references" ADD CONSTRAINT "group_student_references_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_student_references" ADD CONSTRAINT "group_student_references_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_collaborator_references" ADD CONSTRAINT "group_collaborator_references_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_collaborator_references" ADD CONSTRAINT "group_collaborator_references_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_admin_references" ADD CONSTRAINT "group_admin_references_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_admin_references" ADD CONSTRAINT "group_admin_references_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
