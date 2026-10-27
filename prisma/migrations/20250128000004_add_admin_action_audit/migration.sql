-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_COMPLETED', 'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'PACKAGE_UPDATED', 'PACKAGE_ACTIVATED', 'PACKAGE_DEACTIVATED', 'PARAMETER_UPDATED', 'BONUS_ADJUSTED', 'TRANSACTION_UPDATED', 'FINANCIAL_TRANSACTION_CREATED', 'FINANCIAL_TRANSACTION_UPDATED', 'POINTS_RECALCULATED', 'SPONSOR_CHANGED', 'OTHER');

-- CreateTable
CREATE TABLE "admin_action_audits" (
    "id" BIGSERIAL NOT NULL,
    "actionType" "AdminActionType" NOT NULL,
    "performedBy" BIGINT NOT NULL,
    "targetUserId" BIGINT,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" BIGINT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_action_audits_performedBy_createdAt_idx" ON "admin_action_audits"("performedBy", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_audits_targetUserId_createdAt_idx" ON "admin_action_audits"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_audits_resourceType_resourceId_createdAt_idx" ON "admin_action_audits"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_audits_actionType_createdAt_idx" ON "admin_action_audits"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_audits_resourceType_createdAt_idx" ON "admin_action_audits"("resourceType", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_action_audits" ADD CONSTRAINT "admin_action_audits_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_audits" ADD CONSTRAINT "admin_action_audits_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

