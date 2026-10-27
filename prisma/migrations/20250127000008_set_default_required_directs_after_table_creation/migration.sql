-- Migração para definir valores padrão para requiredDirects baseado no nome do nível
-- Esta migração deve ser executada APÓS a criação da tabela career_levels

-- Quartzo: soma total (0 diretos específicos)
UPDATE "career_levels" 
SET "requiredDirects" = 0 
WHERE LOWER(name) LIKE '%quartzo%';

-- Cobre: 2 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 2 
WHERE LOWER(name) LIKE '%cobre%';

-- Ferro: 3 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 3 
WHERE LOWER(name) LIKE '%ferro%';

-- Prata: 4 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 4 
WHERE LOWER(name) LIKE '%prata%';

-- Ouro: 5 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 5 
WHERE LOWER(name) LIKE '%ouro%';

-- Diamante: 6 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 6 
WHERE LOWER(name) LIKE '%diamante%';

-- Esmeralda: 7 diretos
UPDATE "career_levels" 
SET "requiredDirects" = 7 
WHERE LOWER(name) LIKE '%esmeralda%';

-- Para qualquer nível que não tenha sido atualizado, definir como 0 (soma total)
UPDATE "career_levels" 
SET "requiredDirects" = 0 
WHERE "requiredDirects" IS NULL;
