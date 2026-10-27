-- Adicionar coluna excludeFromPointsCalculation na tabela user_packages
ALTER TABLE "user_packages" ADD COLUMN IF NOT EXISTS "excludeFromPointsCalculation" BOOLEAN;

