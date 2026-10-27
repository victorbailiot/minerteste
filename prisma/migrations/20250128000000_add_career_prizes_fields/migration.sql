-- AlterTable
ALTER TABLE "career_levels" ADD COLUMN "careerBonusAmount" DECIMAL(10,2);
ALTER TABLE "career_levels" ADD COLUMN "careerPrizeDescription" VARCHAR(255);
ALTER TABLE "career_levels" ADD COLUMN "careerPrizeValue" DECIMAL(10,2);

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CAREER_BONUS';
ALTER TYPE "TransactionType" ADD VALUE 'CAREER_PRIZE';
