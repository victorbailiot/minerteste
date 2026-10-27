-- Adicionar coluna isUnilevel na tabela user_packages
ALTER TABLE "user_packages" ADD COLUMN IF NOT EXISTS "isUnilevel" BOOLEAN NOT NULL DEFAULT false;
