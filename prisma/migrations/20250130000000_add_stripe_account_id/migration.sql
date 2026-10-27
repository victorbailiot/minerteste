-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeAccountId" VARCHAR(255);

-- CreateIndex (opcional, apenas se necessário buscar por stripeAccountId com frequência)
-- CREATE INDEX "users_stripeAccountId_idx" ON "users"("stripeAccountId");

