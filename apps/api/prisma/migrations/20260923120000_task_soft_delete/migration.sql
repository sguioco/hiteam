ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Task_tenantId_deletedAt_idx" ON "Task"("tenantId", "deletedAt");
