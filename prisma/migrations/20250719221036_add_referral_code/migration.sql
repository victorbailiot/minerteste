/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.
*/

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referralCode" VARCHAR(6);

-- Atualizar usuários existentes com códigos únicos
UPDATE "users" SET "referralCode" = 'ABC' || LPAD(CAST(id AS TEXT), 3, '0') WHERE "referralCode" IS NULL;

-- Tornar a coluna NOT NULL após preencher os dados
ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");
