-- CreateEnum
CREATE TYPE "StoreProductType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "StorePaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BALANCE', 'BOLETO');

-- CreateEnum
CREATE TYPE "StorePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StoreDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "store_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" BIGINT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "shortDesc" VARCHAR(500),
    "sku" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "categoryId" BIGINT NOT NULL,
    "type" "StoreProductType" NOT NULL DEFAULT 'PHYSICAL',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "weight" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "length" DECIMAL(10,2),
    "originZipCode" VARCHAR(10),
    "images" TEXT[],
    "mainImage" VARCHAR(500),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "specifications" JSONB,
    "metaTitle" VARCHAR(255),
    "metaDescription" VARCHAR(500),
    "digitalFileUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_variants" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB NOT NULL,
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_reviews" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_orders" (
    "id" BIGSERIAL NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "shippingAddressId" BIGINT NOT NULL,
    "shippingMethod" VARCHAR(100),
    "shippingService" VARCHAR(100),
    "estimatedDelivery" TIMESTAMP(3),
    "paymentMethod" "StorePaymentMethod" NOT NULL,
    "paymentStatus" "StorePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" BIGINT,
    "couponCode" VARCHAR(50),
    "trackingCode" VARCHAR(255),
    "notes" TEXT,
    "cancelReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_items" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "variantId" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "imageUrl" VARCHAR(500),
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_wishlist_items" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_carts" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_cart_items" (
    "id" BIGSERIAL NOT NULL,
    "cartId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "variantId" BIGINT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_discount_coupons" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "discountType" "StoreDiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minPurchase" DECIMAL(10,2),
    "maxDiscount" DECIMAL(10,2),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_discount_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_shipping_methods" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "carrier" VARCHAR(100) NOT NULL,
    "service" VARCHAR(100) NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_categories_slug_key" ON "store_categories"("slug");

-- CreateIndex
CREATE INDEX "store_categories_slug_idx" ON "store_categories"("slug");

-- CreateIndex
CREATE INDEX "store_categories_parentId_idx" ON "store_categories"("parentId");

-- CreateIndex
CREATE INDEX "store_categories_isActive_sortOrder_idx" ON "store_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_sku_key" ON "store_products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_slug_key" ON "store_products"("slug");

-- CreateIndex
CREATE INDEX "store_products_slug_idx" ON "store_products"("slug");

-- CreateIndex
CREATE INDEX "store_products_sku_idx" ON "store_products"("sku");

-- CreateIndex
CREATE INDEX "store_products_categoryId_idx" ON "store_products"("categoryId");

-- CreateIndex
CREATE INDEX "store_products_isActive_featured_idx" ON "store_products"("isActive", "featured");

-- CreateIndex
CREATE INDEX "store_products_price_idx" ON "store_products"("price");

-- CreateIndex
CREATE UNIQUE INDEX "store_product_variants_sku_key" ON "store_product_variants"("sku");

-- CreateIndex
CREATE INDEX "store_product_variants_productId_idx" ON "store_product_variants"("productId");

-- CreateIndex
CREATE INDEX "store_product_variants_sku_idx" ON "store_product_variants"("sku");

-- CreateIndex
CREATE INDEX "store_product_reviews_productId_isApproved_idx" ON "store_product_reviews"("productId", "isApproved");

-- CreateIndex
CREATE INDEX "store_product_reviews_userId_idx" ON "store_product_reviews"("userId");

-- CreateIndex
CREATE INDEX "store_product_reviews_rating_idx" ON "store_product_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_orderNumber_key" ON "store_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "store_orders_orderNumber_idx" ON "store_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "store_orders_userId_idx" ON "store_orders"("userId");

-- CreateIndex
CREATE INDEX "store_orders_status_idx" ON "store_orders"("status");

-- CreateIndex
CREATE INDEX "store_orders_paymentStatus_idx" ON "store_orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "store_orders_createdAt_idx" ON "store_orders"("createdAt");

-- CreateIndex
CREATE INDEX "store_order_items_orderId_idx" ON "store_order_items"("orderId");

-- CreateIndex
CREATE INDEX "store_order_items_productId_idx" ON "store_order_items"("productId");

-- CreateIndex
CREATE INDEX "store_wishlist_items_userId_idx" ON "store_wishlist_items"("userId");

-- CreateIndex
CREATE INDEX "store_wishlist_items_productId_idx" ON "store_wishlist_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "store_wishlist_items_userId_productId_key" ON "store_wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "store_carts_userId_key" ON "store_carts"("userId");

-- CreateIndex
CREATE INDEX "store_carts_userId_idx" ON "store_carts"("userId");

-- CreateIndex
CREATE INDEX "store_cart_items_cartId_idx" ON "store_cart_items"("cartId");

-- CreateIndex
CREATE INDEX "store_cart_items_productId_idx" ON "store_cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "store_cart_items_cartId_productId_variantId_key" ON "store_cart_items"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "store_discount_coupons_code_key" ON "store_discount_coupons"("code");

-- CreateIndex
CREATE INDEX "store_discount_coupons_code_idx" ON "store_discount_coupons"("code");

-- CreateIndex
CREATE INDEX "store_discount_coupons_isActive_expiresAt_idx" ON "store_discount_coupons"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "store_shipping_methods_isActive_idx" ON "store_shipping_methods"("isActive");

-- AddForeignKey
ALTER TABLE "store_categories" ADD CONSTRAINT "store_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "store_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "store_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_variants" ADD CONSTRAINT "store_product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_reviews" ADD CONSTRAINT "store_product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_reviews" ADD CONSTRAINT "store_product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "store_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_wishlist_items" ADD CONSTRAINT "store_wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_wishlist_items" ADD CONSTRAINT "store_wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_carts" ADD CONSTRAINT "store_carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_cart_items" ADD CONSTRAINT "store_cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "store_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_cart_items" ADD CONSTRAINT "store_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_cart_items" ADD CONSTRAINT "store_cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "store_product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

