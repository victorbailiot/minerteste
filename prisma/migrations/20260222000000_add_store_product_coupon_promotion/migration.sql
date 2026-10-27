-- AlterTable
ALTER TABLE "store_products" ADD COLUMN "generatesCoupon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_products" ADD COLUMN "promotionId" BIGINT;

-- CreateIndex
CREATE INDEX "store_products_promotionId_idx" ON "store_products"("promotionId");

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
