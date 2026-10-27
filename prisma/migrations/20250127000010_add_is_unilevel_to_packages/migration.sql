-- Adicionar coluna isUnilevel na tabela packages
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "isUnilevel" BOOLEAN NOT NULL DEFAULT false;

-- Adicionar outras colunas unilevel que podem estar faltando
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "directBonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "reactivationAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "reactivationBonus" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
