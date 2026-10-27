-- Adicionar restrição única case-insensitive para email
-- Primeiro, remover a restrição única existente
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Adicionar restrição única case-insensitive
CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));

-- Adicionar comentário explicativo
COMMENT ON INDEX users_email_lower_idx IS 'Restrição única case-insensitive para email'; 