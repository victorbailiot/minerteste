-- CreateTable
CREATE TABLE IF NOT EXISTS "stripe_logs" (
    "id" BIGSERIAL NOT NULL,
    "transferId" VARCHAR(255) NOT NULL,
    "transactionId" VARCHAR(255) NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stripe_logs_transferId_idx" ON "stripe_logs"("transferId");

-- CreateIndex
CREATE INDEX "stripe_logs_transactionId_idx" ON "stripe_logs"("transactionId");

-- CreateIndex
CREATE INDEX "stripe_logs_userId_idx" ON "stripe_logs"("userId");

-- CreateIndex
CREATE INDEX "stripe_logs_createdAt_idx" ON "stripe_logs"("createdAt");

