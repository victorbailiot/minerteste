-- AlterTable: Corrigir foreign key de unilevel_user_career.userId
-- Antes: referenciava unilevel_users.id
-- Depois: referencia users.id

-- 1. Remover a constraint antiga
ALTER TABLE "unilevel_user_career" DROP CONSTRAINT IF EXISTS "unilevel_user_career_userId_fkey";

-- 2. Adicionar a constraint correta
ALTER TABLE "unilevel_user_career" ADD CONSTRAINT "unilevel_user_career_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

