-- Adicionar campos level e sourceUserId à tabela transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "level" INTEGER;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "sourceUserId" BIGINT;

-- Adicionar foreign key para sourceUserId
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sourceUserId_fkey" 
FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
