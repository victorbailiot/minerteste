-- AlterTable
ALTER TABLE "users" ADD COLUMN     "financialPasswordResetToken" VARCHAR(255),
ADD COLUMN     "financialPasswordResetExpires" TIMESTAMP(3);

