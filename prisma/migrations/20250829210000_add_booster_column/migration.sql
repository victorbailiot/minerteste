-- Adiciona a coluna "booster" na tabela packages
-- Mantém compatibilidade com o campo Prisma `boosted` via @map("booster")

ALTER TABLE "packages"
ADD COLUMN IF NOT EXISTS "booster" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;


