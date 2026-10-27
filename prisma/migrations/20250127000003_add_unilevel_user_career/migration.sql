-- CreateTable
CREATE TABLE "unilevel_user_career" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "careerId" BIGINT NOT NULL,
    "totalNetworkPoints" INTEGER NOT NULL,
    "validPoints" INTEGER NOT NULL,
    "maxTeamVolumePercent" DECIMAL(5,2) NOT NULL,
    "graduatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unilevel_user_career_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "unilevel_user_career" ADD CONSTRAINT "unilevel_user_career_userId_fkey" FOREIGN KEY ("userId") REFERENCES "unilevel_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unilevel_user_career" ADD CONSTRAINT "unilevel_user_career_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "career_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 