-- CreateTable
CREATE TABLE "profit_schedules" (
    "id" BIGSERIAL NOT NULL,
    "totalProfit" DECIMAL(15,2) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_schedules_isActive_idx" ON "profit_schedules"("isActive");

-- CreateIndex
CREATE INDEX "profit_schedules_scheduledAt_idx" ON "profit_schedules"("scheduledAt");

-- CreateIndex
CREATE INDEX "profit_schedules_createdAt_idx" ON "profit_schedules"("createdAt");

-- AddForeignKey
ALTER TABLE "profit_schedules" ADD CONSTRAINT "profit_schedules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

