-- Índices para otimizar a busca de equipe
-- Esta migração adiciona índices que melhoram significativamente a performance da query recursiva

-- Índice para sponsorId na tabela users (busca de downlines)
-- Inclui filtro WHERE para index parcial (apenas usuários ativos)
CREATE INDEX IF NOT EXISTS "idx_users_sponsor_active" 
ON "users"("sponsorId") 
WHERE "isActive" = true;

-- Índice para sponsorId na tabela unilevel_users
CREATE INDEX IF NOT EXISTS "idx_unilevel_users_sponsor_active" 
ON "unilevel_users"("sponsorId") 
WHERE "isActive" = true;

-- Índice composto para busca de pacotes ativos por usuário
-- Inclui createdAt para ordenação eficiente (DESC)
CREATE INDEX IF NOT EXISTS "idx_user_packages_user_active_created" 
ON "user_packages"("userId", "isActive", "createdAt" DESC);

-- Índice para busca de carreira por usuário
CREATE INDEX IF NOT EXISTS "idx_unilevel_user_career_user_id" 
ON "unilevel_user_career"("userId");

-- Índice para referralCode (usado em buscas e JOINs)
CREATE INDEX IF NOT EXISTS "idx_users_referral_code" 
ON "users"("referralCode");

-- Comentário sobre a melhoria de performance
COMMENT ON INDEX "idx_users_sponsor_active" IS 'Otimiza busca recursiva de downlines na árvore unilevel';
COMMENT ON INDEX "idx_user_packages_user_active_created" IS 'Otimiza busca do último pacote ativo por usuário';

