/*
  Warnings:

  - You are about to drop the `email_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO');

-- DropTable
DROP TABLE "email_logs";

-- DropEnum
DROP TYPE "EmailLogStatus";

-- CreateTable
CREATE TABLE "application_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'ERROR',
    "source" TEXT NOT NULL,
    "path" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_logs_level_idx" ON "application_logs"("level");

-- CreateIndex
CREATE INDEX "application_logs_source_idx" ON "application_logs"("source");

-- CreateIndex
CREATE INDEX "application_logs_userId_idx" ON "application_logs"("userId");

-- CreateIndex
CREATE INDEX "application_logs_createdAt_idx" ON "application_logs"("createdAt");
