-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "DocumentType" AS ENUM ('CPF', 'PASSPORT', 'NATIONAL_ID', 'SSN', 'DNI', 'NIE', 'RUT', 'CI', 'RG', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" VARCHAR(2),
ADD COLUMN IF NOT EXISTS "documentType" "DocumentType",
ADD COLUMN IF NOT EXISTS "documentNumber" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "phoneCountryCode" VARCHAR(5),
ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20);

