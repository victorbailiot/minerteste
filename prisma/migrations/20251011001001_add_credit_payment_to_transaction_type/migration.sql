-- Add CREDIT_PAYMENT to TransactionType enum in Postgres (idempotent)
DO $$
BEGIN
  ALTER TYPE "TransactionType" ADD VALUE 'CREDIT_PAYMENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


