-- Renovação de cota: dias acrescentados na única renovação permitida (NULL = nunca renovada)
ALTER TABLE "user_packages" ADD COLUMN IF NOT EXISTS "renewedDays" INTEGER;

-- Novo tipo de transação: Bônus de Ajuste
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BONUS_ADJUSTMENT';

-- Nova ação de auditoria: geração manual de bônus de indicação pelo admin
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'BONUS_GENERATED' AFTER 'BONUS_ADJUSTED';
