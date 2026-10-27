-- Bônus direto do pacote no momento da compra (snapshot histórico)
ALTER TABLE "user_packages" ADD COLUMN IF NOT EXISTS "directBonusSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Backfill: valor atual de directBonus do pacote vinculado
UPDATE "user_packages" up
SET "directBonusSnapshot" = p."directBonus"
FROM "packages" p
WHERE up."packageId" = p.id
  AND up."directBonusSnapshot" = 0;
