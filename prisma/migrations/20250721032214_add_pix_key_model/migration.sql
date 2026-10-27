-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');

-- CreateTable
CREATE TABLE "pix_keys" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "pixKeyType" "PixKeyType" NOT NULL,
    "pixKey" VARCHAR(255) NOT NULL,
    "accountHolderName" VARCHAR(255) NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pix_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pix_keys_userId_key" ON "pix_keys"("userId");

-- AddForeignKey
ALTER TABLE "pix_keys" ADD CONSTRAINT "pix_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
