-- Adicionar coluna percentExtra na tabela packages
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "percentExtra" DECIMAL(5,2) NOT NULL DEFAULT 0.00;

