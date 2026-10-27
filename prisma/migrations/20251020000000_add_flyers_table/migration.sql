-- CreateTable: flyers
CREATE TABLE "flyers" (
  "id" BIGSERIAL PRIMARY KEY,
  "careerLevelId" BIGINT NOT NULL,
  "textColor" VARCHAR(50) NOT NULL,
  "backgroundImage" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ForeignKey
ALTER TABLE "flyers"
ADD CONSTRAINT "flyers_careerLevelId_fkey"
FOREIGN KEY ("careerLevelId") REFERENCES "career_levels"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Index to efficiently get latest flyer per career level
CREATE INDEX "flyers_careerLevelId_createdAt_idx" ON "flyers"("careerLevelId", "createdAt" DESC);


