-- CreateTable
CREATE TABLE "miners" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "miners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_miners" (
    "id" BIGSERIAL NOT NULL,
    "packageId" BIGINT NOT NULL,
    "minerId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_miners_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "payment_vouchers" ADD COLUMN "minerId" BIGINT;

-- AlterTable
ALTER TABLE "user_packages" ADD COLUMN "minerId" BIGINT;

-- CreateIndex
CREATE INDEX "package_miners_packageId_idx" ON "package_miners"("packageId");

-- CreateIndex
CREATE INDEX "package_miners_minerId_idx" ON "package_miners"("minerId");

-- CreateIndex
CREATE UNIQUE INDEX "package_miners_packageId_minerId_key" ON "package_miners"("packageId", "minerId");

-- AddForeignKey
ALTER TABLE "package_miners" ADD CONSTRAINT "package_miners_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_miners" ADD CONSTRAINT "package_miners_minerId_fkey" FOREIGN KEY ("minerId") REFERENCES "miners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_packages" ADD CONSTRAINT "user_packages_minerId_fkey" FOREIGN KEY ("minerId") REFERENCES "miners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_minerId_fkey" FOREIGN KEY ("minerId") REFERENCES "miners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
