-- CreateTable
-- Adicionar coluna pagarmeCustomerId na tabela users (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users' 
        AND column_name = 'pagarmeCustomerId'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "pagarmeCustomerId" VARCHAR(100);
    END IF;
END $$;
