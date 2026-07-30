-- CreateEnum
CREATE TYPE "DifficultySource" AS ENUM ('LEGACY', 'MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "DifficultyChangeStatus" AS ENUM ('PROPOSED', 'APPLIED', 'REJECTED', 'REVERTED');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficultyLockedAt" TIMESTAMP(3),
ADD COLUMN     "difficultyScore" DOUBLE PRECISION,
ADD COLUMN     "difficultySource" "DifficultySource" NOT NULL DEFAULT 'LEGACY',
ADD COLUMN     "discriminationIndex" DOUBLE PRECISION,
ADD COLUMN     "qualityFlagCode" TEXT,
ADD COLUMN     "statsComputedAt" TIMESTAMP(3),
ADD COLUMN     "suggestedAt" TIMESTAMP(3),
ADD COLUMN     "suggestedDifficulty" "DifficultyLevel",
ADD COLUMN     "suggestionConfidence" DOUBLE PRECISION,
ADD COLUMN     "timesGraded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "difficulty_scales" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "anchorQuestionIds" JSONB NOT NULL,
    "cutEasyMedium" DOUBLE PRECISION NOT NULL,
    "cutMediumHard" DOUBLE PRECISION NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEquatingRmsd" DOUBLE PRECISION,
    "lastEquatedAt" TIMESTAMP(3),
    "confidence" TEXT NOT NULL DEFAULT 'LOW',
    "fitKappa" DOUBLE PRECISION,
    "fitSampleSize" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "difficulty_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_calibration_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "mode" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "triggeredById" TEXT,
    "resultsScanned" INTEGER NOT NULL DEFAULT 0,
    "answersScanned" INTEGER NOT NULL DEFAULT 0,
    "questionsWithStats" INTEGER NOT NULL DEFAULT 0,
    "statsUpdated" INTEGER NOT NULL DEFAULT 0,
    "proposalsCreated" INTEGER NOT NULL DEFAULT 0,
    "skippedLowEvidence" INTEGER NOT NULL DEFAULT 0,
    "skippedCooldown" INTEGER NOT NULL DEFAULT 0,
    "skippedManual" INTEGER NOT NULL DEFAULT 0,
    "skippedUnconnected" INTEGER NOT NULL DEFAULT 0,
    "qualityFlagged" INTEGER NOT NULL DEFAULT 0,
    "distributionBefore" JSONB,
    "distributionAfter" JSONB,
    "isAnomalous" BOOLEAN NOT NULL DEFAULT false,
    "anomalyReason" TEXT,
    "errors" TEXT[],

    CONSTRAINT "question_calibration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_difficulty_audits" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "runId" TEXT,
    "status" "DifficultyChangeStatus" NOT NULL DEFAULT 'PROPOSED',
    "trigger" TEXT NOT NULL,
    "fromLevel" "DifficultyLevel" NOT NULL,
    "toLevel" "DifficultyLevel" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonMetadata" JSONB,
    "difficultyScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "correctRate" DOUBLE PRECISION,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "revertedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_difficulty_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "difficulty_scales_subjectId_key" ON "difficulty_scales"("subjectId");

-- CreateIndex
CREATE INDEX "question_calibration_runs_startedAt_idx" ON "question_calibration_runs"("startedAt");

-- CreateIndex
CREATE INDEX "question_calibration_runs_mode_idx" ON "question_calibration_runs"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "question_difficulty_audits_revertedFromId_key" ON "question_difficulty_audits"("revertedFromId");

-- CreateIndex
CREATE INDEX "question_difficulty_audits_status_createdAt_idx" ON "question_difficulty_audits"("status", "createdAt");

-- CreateIndex
CREATE INDEX "question_difficulty_audits_questionId_createdAt_idx" ON "question_difficulty_audits"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "question_difficulty_audits_runId_idx" ON "question_difficulty_audits"("runId");

-- CreateIndex
CREATE INDEX "questions_difficultySource_idx" ON "questions"("difficultySource");

-- CreateIndex
CREATE INDEX "questions_suggestedDifficulty_idx" ON "questions"("suggestedDifficulty");

-- AddForeignKey
ALTER TABLE "difficulty_scales" ADD CONSTRAINT "difficulty_scales_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "custom_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_difficulty_audits" ADD CONSTRAINT "question_difficulty_audits_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_difficulty_audits" ADD CONSTRAINT "question_difficulty_audits_runId_fkey" FOREIGN KEY ("runId") REFERENCES "question_calibration_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_difficulty_audits" ADD CONSTRAINT "question_difficulty_audits_revertedFromId_fkey" FOREIGN KEY ("revertedFromId") REFERENCES "question_difficulty_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
