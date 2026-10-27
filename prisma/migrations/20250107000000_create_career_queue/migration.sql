-- CreateTable
CREATE TABLE IF NOT EXISTS "unilevel_career_queue" (
    "id" BIGSERIAL PRIMARY KEY,
    "userId" BIGINT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unilevel_career_queue_userId_key" ON "unilevel_career_queue"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "unilevel_career_queue_processed_attempts_idx" ON "unilevel_career_queue"("processed", "attempts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "unilevel_career_queue_queuedAt_idx" ON "unilevel_career_queue"("queuedAt");

-- AddForeignKey
ALTER TABLE "unilevel_career_queue" ADD CONSTRAINT "unilevel_career_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

