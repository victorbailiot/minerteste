-- Add visibleOnlyForActiveUsers column to packages table
ALTER TABLE "packages"
ADD COLUMN IF NOT EXISTS "visibleOnlyForActiveUsers" BOOLEAN NOT NULL DEFAULT false;
