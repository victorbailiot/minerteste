-- AlterTable: Add new fields for points cache strategy
ALTER TABLE "unilevel_users" 
ADD COLUMN "ownPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "networkPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pointsLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "pointsNeedsRecalc" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Index for efficient query of users needing recalc
CREATE INDEX "unilevel_users_pointsNeedsRecalc_pointsLastUpdated_idx" ON "unilevel_users"("pointsNeedsRecalc", "pointsLastUpdated");

-- Data Migration: Populate ownPoints from existing totalPoints
-- This assumes current totalPoints represents own points (will be recalculated later)
UPDATE "unilevel_users" 
SET "ownPoints" = "totalPoints",
    "networkPoints" = 0,
    "pointsLastUpdated" = CURRENT_TIMESTAMP,
    "pointsNeedsRecalc" = true;

-- Comment explaining the strategy
COMMENT ON COLUMN "unilevel_users"."ownPoints" IS 'Points from user own packages';
COMMENT ON COLUMN "unilevel_users"."networkPoints" IS 'Points from network downline';
COMMENT ON COLUMN "unilevel_users"."totalPoints" IS 'Cached total: ownPoints + networkPoints';
COMMENT ON COLUMN "unilevel_users"."pointsNeedsRecalc" IS 'Flag to mark users needing points recalculation';
COMMENT ON COLUMN "unilevel_users"."pointsLastUpdated" IS 'Last time points were updated';

