-- Migration: add_miner_to_clube300
-- Adiciona minerId ao Clube300Member e ajusta constraints para suporte multi-mineradora

-- 1. Remover índices únicos antigos (criados com CREATE UNIQUE INDEX, não ADD CONSTRAINT)
DROP INDEX IF EXISTS "clube300_members_userId_key";
DROP INDEX IF EXISTS "clube300_members_memberNumber_key";

-- 2. Garantir ao menos uma mineradora para membros legados (tabela pode estar vazia)
INSERT INTO "miners" ("name", "address", "city", "state", "createdAt", "updatedAt")
SELECT 'Mineradora Padrão', 'N/A', 'N/A', 'NA', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "miners");

-- 3. Adicionar coluna minerId (nullable temporariamente)
ALTER TABLE "clube300_members" ADD COLUMN IF NOT EXISTS "minerId" BIGINT;

-- 4. Vincular membros existentes à primeira mineradora disponível
UPDATE "clube300_members"
SET "minerId" = (SELECT id FROM "miners" ORDER BY id ASC LIMIT 1)
WHERE "minerId" IS NULL;

-- 5. Tornar coluna NOT NULL agora que todos os registros têm valor
ALTER TABLE "clube300_members" ALTER COLUMN "minerId" SET NOT NULL;

-- 6. Adicionar foreign key para miners
ALTER TABLE "clube300_members"
  ADD CONSTRAINT "clube300_members_minerId_fkey"
  FOREIGN KEY ("minerId") REFERENCES "miners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Adicionar novas constraints compostas
ALTER TABLE "clube300_members"
  ADD CONSTRAINT "clube300_members_userId_minerId_key" UNIQUE ("userId", "minerId");

ALTER TABLE "clube300_members"
  ADD CONSTRAINT "clube300_members_memberNumber_minerId_key" UNIQUE ("memberNumber", "minerId");

-- 8. Criar índice em minerId para performance
CREATE INDEX IF NOT EXISTS "clube300_members_minerId_idx" ON "clube300_members"("minerId");
