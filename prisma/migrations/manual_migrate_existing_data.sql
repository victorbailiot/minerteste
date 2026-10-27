-- Migration script to update existing users with default international fields
-- This script should be run manually after the schema update

-- Update existing users with Brazilian defaults
UPDATE users 
SET 
  country = 'BR',
  "documentType" = 'CPF',
  "documentNumber" = cpf,
  "phoneCountryCode" = '+55',
  "phoneNumber" = REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), ' ', ''), '-', '')
WHERE cpf IS NOT NULL AND country IS NULL;

-- Note: This migration:
-- 1. Sets country to 'BR' (Brazil) for all existing users
-- 2. Sets documentType to 'CPF' for users with CPF
-- 3. Copies CPF to documentNumber
-- 4. Sets phoneCountryCode to '+55' (Brazil)
-- 5. Cleans phone number by removing formatting characters
-- 6. Only updates users where country is NULL (existing users)









