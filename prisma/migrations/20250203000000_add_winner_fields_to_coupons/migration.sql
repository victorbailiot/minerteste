-- AlterTable
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "isWinner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "coupons_isWinner_idx" ON "coupons"("isWinner");



















