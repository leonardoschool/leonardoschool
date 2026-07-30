-- AlterEnum
ALTER TYPE "QuestionFeedbackType" ADD VALUE 'ALTERNATIVE_ANSWER';

-- AlterTable
ALTER TABLE "question_feedbacks" ADD COLUMN     "proposedKeyword" TEXT,
ADD COLUMN     "simulationResultId" TEXT;

-- CreateIndex
CREATE INDEX "question_feedbacks_simulationResultId_idx" ON "question_feedbacks"("simulationResultId");

-- AddForeignKey
ALTER TABLE "question_feedbacks" ADD CONSTRAINT "question_feedbacks_simulationResultId_fkey" FOREIGN KEY ("simulationResultId") REFERENCES "simulation_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
