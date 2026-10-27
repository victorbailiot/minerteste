-- CreateTable
CREATE TABLE "career_level_leg_requirements" (
    "id" BIGSERIAL PRIMARY KEY,
    "careerId" BIGINT NOT NULL,
    "legSlot" INTEGER NOT NULL,
    "requiredCareerId" BIGINT NOT NULL,
    "includeIndirects" BOOLEAN NOT NULL DEFAULT true,
    "minOccurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes
CREATE INDEX "career_level_leg_requirements_careerId_idx" ON "career_level_leg_requirements" ("careerId");
CREATE INDEX "career_level_leg_requirements_requiredCareerId_idx" ON "career_level_leg_requirements" ("requiredCareerId");

-- Foreign Keys
ALTER TABLE "career_level_leg_requirements"
  ADD CONSTRAINT "career_level_leg_requirements_careerId_fkey"
  FOREIGN KEY ("careerId") REFERENCES "career_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_level_leg_requirements"
  ADD CONSTRAINT "career_level_leg_requirements_requiredCareerId_fkey"
  FOREIGN KEY ("requiredCareerId") REFERENCES "career_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


