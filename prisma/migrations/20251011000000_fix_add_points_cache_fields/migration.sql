-- Fix: Add missing points cache fields to unilevel_users
-- These fields should have been added by migration 20251009000000_add_points_cache_fields
-- but were not actually created in the database

-- AlterTable: Add new fields for points cache strategy (with IF NOT EXISTS for safety)
DO $$ 
BEGIN
  -- Add ownPoints column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unilevel_users' AND column_name = 'ownPoints'
  ) THEN
    ALTER TABLE "unilevel_users" ADD COLUMN "ownPoints" INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add networkPoints column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unilevel_users' AND column_name = 'networkPoints'
  ) THEN
    ALTER TABLE "unilevel_users" ADD COLUMN "networkPoints" INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add pointsLastUpdated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unilevel_users' AND column_name = 'pointsLastUpdated'
  ) THEN
    ALTER TABLE "unilevel_users" ADD COLUMN "pointsLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Add pointsNeedsRecalc column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unilevel_users' AND column_name = 'pointsNeedsRecalc'
  ) THEN
    ALTER TABLE "unilevel_users" ADD COLUMN "pointsNeedsRecalc" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- CreateIndex: Index for efficient query of users needing recalc (with IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unilevel_users_pointsNeedsRecalc_pointsLastUpdated_idx'
  ) THEN
    CREATE INDEX "unilevel_users_pointsNeedsRecalc_pointsLastUpdated_idx" 
    ON "unilevel_users"("pointsNeedsRecalc", "pointsLastUpdated");
  END IF;
END $$;

-- Data Migration: Populate ownPoints from existing totalPoints
-- This assumes current totalPoints represents own points (will be recalculated later)
UPDATE "unilevel_users" 
SET "ownPoints" = "totalPoints",
    "networkPoints" = 0,
    "pointsLastUpdated" = CURRENT_TIMESTAMP,
    "pointsNeedsRecalc" = true
WHERE "ownPoints" = 0 AND "networkPoints" = 0;


