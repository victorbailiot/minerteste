-- Remove a tabela unilevel_monthly_points
DROP TABLE IF EXISTS "unilevel_monthly_points";

-- Remove a coluna monthlyPoints da tabela unilevel_users se a tabela existir
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unilevel_users') THEN
        ALTER TABLE "unilevel_users" DROP COLUMN IF EXISTS "monthlyPoints";
    END IF;
END $$; 