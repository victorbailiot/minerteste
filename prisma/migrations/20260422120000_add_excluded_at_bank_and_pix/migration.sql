-- Soft delete no perfil: conta bancária e chave PIX (excludedAt)
-- Idempotente: não falha se colunas/índices já existirem (ex.: após db push).

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "excludedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pix_keys" ADD COLUMN IF NOT EXISTS "excludedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_accounts_userId_excludedAt_idx" ON "bank_accounts"("userId", "excludedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pix_keys_userId_excludedAt_idx" ON "pix_keys"("userId", "excludedAt");
