-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('CRON_JOB', 'SYSTEM_EVENT', 'SECURITY', 'PERFORMANCE', 'BUSINESS_LOGIC', 'INTEGRATION', 'DATABASE', 'AUTHENTICATION', 'USER', 'PACKAGE', 'TRANSACTION', 'WITHDRAWAL', 'CONTRACT', 'PROFIT_DISTRIBUTION', 'FINANCIAL_TRANSACTION', 'PIX_KEY', 'PARAMETER', 'CYCLE', 'USER_ACTIVATION', 'USER_PACKAGE', 'USER_POINTS_HISTORY');

-- CreateTable
CREATE TABLE "system_logs" (
    "id" BIGSERIAL NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "category" "LogCategory" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_logs_category_createdAt_idx" ON "system_logs"("category", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_level_createdAt_idx" ON "system_logs"("level", "createdAt");
