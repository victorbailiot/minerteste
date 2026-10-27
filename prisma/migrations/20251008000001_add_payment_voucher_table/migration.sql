-- CreateEnum
CREATE TYPE "PaymentVoucherStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "payment_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "beneficiaryId" BIGINT NOT NULL,
    "payerId" BIGINT,
    "packageId" BIGINT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" VARCHAR(500),
    "status" "PaymentVoucherStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transactionId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_code_key" ON "payment_vouchers"("code");

-- CreateIndex
CREATE INDEX "payment_vouchers_code_idx" ON "payment_vouchers"("code");

-- CreateIndex
CREATE INDEX "payment_vouchers_beneficiaryId_idx" ON "payment_vouchers"("beneficiaryId");

-- CreateIndex
CREATE INDEX "payment_vouchers_status_expiresAt_idx" ON "payment_vouchers"("status", "expiresAt");


