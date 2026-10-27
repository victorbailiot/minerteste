-- AlterTable: tornar shippingAddressId opcional para pedidos digitais
ALTER TABLE "store_orders" ALTER COLUMN "shippingAddressId" DROP NOT NULL;
