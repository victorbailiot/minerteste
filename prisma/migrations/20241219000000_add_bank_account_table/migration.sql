-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('checking', 'savings');

-- CreateEnum
CREATE TYPE "TransferInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AnticipationType" AS ENUM ('full', 'partial');

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "recipientId" VARCHAR(255) NOT NULL,
    "recipientName" VARCHAR(255) NOT NULL,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "recipientDocument" VARCHAR(20) NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "recipientStatus" VARCHAR(50) NOT NULL,
    "bankCode" VARCHAR(10) NOT NULL,
    "bankName" VARCHAR(255),
    "branchNumber" VARCHAR(10) NOT NULL,
    "branchCheckDigit" VARCHAR(2),
    "accountNumber" VARCHAR(20) NOT NULL,
    "accountCheckDigit" VARCHAR(2) NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "holderName" VARCHAR(255) NOT NULL,
    "holderType" "RecipientType" NOT NULL,
    "holderDocument" VARCHAR(20) NOT NULL,
    "transferEnabled" BOOLEAN NOT NULL DEFAULT true,
    "transferInterval" "TransferInterval" NOT NULL DEFAULT 'DAILY',
    "transferDay" INTEGER,
    "anticipationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "anticipationType" "AnticipationType",
    "anticipationVolumePercentage" INTEGER,
    "anticipationDelay" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_userId_key" ON "bank_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_recipientId_key" ON "bank_accounts"("recipientId");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;