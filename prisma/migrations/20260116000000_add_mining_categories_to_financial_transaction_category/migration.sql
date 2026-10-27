-- Adiciona novas categorias ao enum FinancialTransactionCategory
-- Usa DO $$ para verificar se o valor já existe antes de adicionar

DO $$ 
DECLARE
    enum_type_oid oid;
    new_categories TEXT[] := ARRAY[
        'FUEL',
        'EQUIPMENT',
        'MAINTENANCE',
        'LABOR',
        'EXPLOSIVES',
        'PROCESSING',
        'EXPLORATION',
        'DEVELOPMENT',
        'WATER',
        'ENERGY',
        'ENVIRONMENTAL',
        'TRANSPORT',
        'REPAIRS',
        'RENTAL',
        'INSURANCE',
        'LEGAL',
        'MARKETING',
        'OFFICE',
        'TRAVEL',
        'TRAINING',
        'CONSULTING',
        'UTILITIES',
        'PENALTY',
        'INTEREST',
        'DEPRECIATION',
        'LOAN',
        'GRANT',
        'SUBSCRIPTION'
    ];
    category TEXT;
BEGIN
    -- Obter OID do tipo enum
    SELECT oid INTO enum_type_oid 
    FROM pg_type 
    WHERE typname = 'FinancialTransactionCategory';

    -- Adicionar cada categoria se não existir
    FOREACH category IN ARRAY new_categories
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = category 
            AND enumtypid = enum_type_oid
        ) THEN
            EXECUTE format('ALTER TYPE "FinancialTransactionCategory" ADD VALUE %L', category);
        END IF;
    END LOOP;
END $$;

-- Adiciona coluna receiptUrls se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_transactions' 
        AND column_name = 'receiptUrls'
    ) THEN
        ALTER TABLE "financial_transactions" 
        ADD COLUMN "receiptUrls" JSON;
    END IF;
END $$;