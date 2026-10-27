-- CreateTable
CREATE TABLE "direct_bonus_limit_tracker" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "sponsorId" BIGINT NOT NULL,
    "packageId" BIGINT NOT NULL,
    "totalPaid" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "limitAmount" DECIMAL(15, 2) NOT NULL,
    "limitReached" BOOLEAN NOT NULL DEFAULT false,
    "lastResetAt" TIMESTAMP(3),
    "resetCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_bonus_limit_tracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_bonus_limit_tracker_userId_sponsorId_packageId_key" ON "direct_bonus_limit_tracker"("userId", "sponsorId", "packageId");

-- CreateIndex
CREATE INDEX "direct_bonus_limit_tracker_userId_packageId_idx" ON "direct_bonus_limit_tracker"("userId", "packageId");

-- CreateIndex
CREATE INDEX "direct_bonus_limit_tracker_sponsorId_packageId_idx" ON "direct_bonus_limit_tracker"("sponsorId", "packageId");

-- AddForeignKey
ALTER TABLE "direct_bonus_limit_tracker" ADD CONSTRAINT "direct_bonus_limit_tracker_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_bonus_limit_tracker" ADD CONSTRAINT "direct_bonus_limit_tracker_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_bonus_limit_tracker" ADD CONSTRAINT "direct_bonus_limit_tracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

