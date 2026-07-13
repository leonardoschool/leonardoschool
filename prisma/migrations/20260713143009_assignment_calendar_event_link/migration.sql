-- AlterTable
ALTER TABLE "simulation_assignments" ADD COLUMN     "calendarEventId" TEXT;

-- CreateIndex
CREATE INDEX "simulation_assignments_calendarEventId_idx" ON "simulation_assignments"("calendarEventId");

-- AddForeignKey
ALTER TABLE "simulation_assignments" ADD CONSTRAINT "simulation_assignments_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
