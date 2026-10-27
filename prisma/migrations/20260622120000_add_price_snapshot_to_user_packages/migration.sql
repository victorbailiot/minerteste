-- Preço do pacote no momento da compra (snapshot histórico)
ALTER TABLE "user_packages" ADD COLUMN IF NOT EXISTS "priceSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Backfill: preço unitário da transação de compra
UPDATE "user_packages" up
SET "priceSnapshot" = (t.amount / GREATEST(t.quantity, 1))
FROM "transactions" t
WHERE up."transactionId" = t.id
  AND up."priceSnapshot" = 0
  AND t.amount > 0;

-- Fallback: preço atual do pacote vinculado
UPDATE "user_packages" up
SET "priceSnapshot" = p.price
FROM "packages" p
WHERE up."packageId" = p.id
  AND up."priceSnapshot" = 0;
