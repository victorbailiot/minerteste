-- Add BONUS_ADJUSTMENT to TransactionType enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BONUS_ADJUSTMENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')
    ) THEN
        ALTER TYPE "TransactionType" ADD VALUE 'BONUS_ADJUSTMENT';
    END IF;
END $$;
