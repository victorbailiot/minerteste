-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('ACCRUAL', 'CYCLE_CONSUMPTION', 'BINARY_CONSUMPTION', 'ACTIVATION_CONSUMPTION', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "user_points_history" ADD COLUMN     "pointType" "PointType" NOT NULL DEFAULT 'ACCRUAL';

-- CreateIndex
CREATE INDEX "user_points_history_userId_pointType_createdAt_idx" ON "user_points_history"("userId", "pointType", "createdAt");
