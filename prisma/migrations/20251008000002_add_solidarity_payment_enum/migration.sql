-- AlterEnum
-- Adiciona SOLIDARITY_PAYMENT ao enum TransactionType se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'SOLIDARITY_PAYMENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')
    ) THEN
        ALTER TYPE "TransactionType" ADD VALUE 'SOLIDARITY_PAYMENT';
    END IF;
END $$;


