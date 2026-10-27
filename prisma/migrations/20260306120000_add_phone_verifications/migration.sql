-- CreateEnum (idempotente - só cria se não existir)
DO $$ BEGIN
    CREATE TYPE "PhoneVerificationPurpose" AS ENUM ('REGISTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "phone_verifications" (
    "id" BIGSERIAL NOT NULL,
    "countryCode" VARCHAR(5) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "purpose" "PhoneVerificationPurpose" NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "verificationToken" VARCHAR(255),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "phone_verifications_verificationToken_key" ON "phone_verifications"("verificationToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_verifications_countryCode_phoneNumber_purpose_expiresAt_idx" ON "phone_verifications"("countryCode", "phoneNumber", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_verifications_verificationToken_idx" ON "phone_verifications"("verificationToken");
