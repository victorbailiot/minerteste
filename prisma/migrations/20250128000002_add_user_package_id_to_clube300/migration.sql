-- Add userPackageId column to clube300_members table
ALTER TABLE "clube300_members" ADD COLUMN "userPackageId" BIGINT;

-- Create unique index for userPackageId
CREATE UNIQUE INDEX "clube300_members_userPackageId_key" ON "clube300_members"("userPackageId");

-- Add foreign key constraint
ALTER TABLE "clube300_members" ADD CONSTRAINT "clube300_members_userPackageId_fkey" FOREIGN KEY ("userPackageId") REFERENCES "user_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove packageType column as it's no longer needed
ALTER TABLE "clube300_members" DROP COLUMN IF EXISTS "packageType";

-- Remove joinedAt column as it's redundant with createdAt
ALTER TABLE "clube300_members" DROP COLUMN IF EXISTS "joinedAt";
