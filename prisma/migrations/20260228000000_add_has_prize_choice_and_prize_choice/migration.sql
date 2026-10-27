-- AlterTable: Adicionar hasPrizeChoice em career_levels (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_levels' AND column_name = 'hasPrizeChoice'
  ) THEN
    ALTER TABLE "career_levels" ADD COLUMN "hasPrizeChoice" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- AlterTable: Adicionar prizeChoice em unilevel_user_career (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'unilevel_user_career' AND column_name = 'prizeChoice'
  ) THEN
    ALTER TABLE "unilevel_user_career" ADD COLUMN "prizeChoice" VARCHAR(20);
  END IF;
END $$;
