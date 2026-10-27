-- Auditoria de correção de bônus direto via admin_action_audits (enum)
DO $$ BEGIN
  ALTER TYPE "AdminActionType" ADD VALUE 'DIRECT_BONUS_FIX';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
