-- Criar enum UnilevelBonusType se não existir
DO $$ BEGIN
    CREATE TYPE "UnilevelBonusType" AS ENUM ('DIRECT_BONUS', 'INDIRECT_BONUS', 'REACTIVATION_BONUS', 'PROFIT_SHARE', 'CAREER_BONUS', 'TRAVEL_BONUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela career_levels se não existir
CREATE TABLE IF NOT EXISTS "career_levels" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "requiredPoints" INTEGER NOT NULL,
    "maxTeamVolumePercent" DECIMAL(5,2) NOT NULL,
    "indirectBonusLevels" INTEGER NOT NULL,
    "reactivationLevels" INTEGER NOT NULL,
    "extraProfitPercent" DECIMAL(5,2) NOT NULL,
    "travelBonus" VARCHAR(255),
    "travelValue" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requiredDirects" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "career_levels_pkey" PRIMARY KEY ("id")
);

-- Criar tabela unilevel_users se não existir
CREATE TABLE IF NOT EXISTS "unilevel_users" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "sponsorId" BIGINT,
    "careerLevelId" BIGINT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "teamVolume" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unilevel_users_pkey" PRIMARY KEY ("id")
);

-- Criar índices únicos se não existirem
DO $$ BEGIN
    CREATE UNIQUE INDEX "unilevel_users_userId_key" ON "unilevel_users"("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar foreign keys se não existirem
DO $$ BEGIN
    ALTER TABLE "unilevel_users" ADD CONSTRAINT "unilevel_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_users" ADD CONSTRAINT "unilevel_users_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_users" ADD CONSTRAINT "unilevel_users_careerLevelId_fkey" FOREIGN KEY ("careerLevelId") REFERENCES "career_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela unilevel_bonuses se não existir
CREATE TABLE IF NOT EXISTS "unilevel_bonuses" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "type" "UnilevelBonusType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "level" INTEGER,
    "sourceUserId" BIGINT,
    "sourcePackageId" BIGINT,
    "description" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unilevel_bonuses_pkey" PRIMARY KEY ("id")
);

-- Criar foreign keys para unilevel_bonuses se não existirem
DO $$ BEGIN
    ALTER TABLE "unilevel_bonuses" ADD CONSTRAINT "unilevel_bonuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "unilevel_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_bonuses" ADD CONSTRAINT "unilevel_bonuses_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "unilevel_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_bonuses" ADD CONSTRAINT "unilevel_bonuses_sourcePackageId_fkey" FOREIGN KEY ("sourcePackageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela unilevel_profit_distributions se não existir
CREATE TABLE IF NOT EXISTS "unilevel_profit_distributions" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "packageId" BIGINT NOT NULL,
    "careerLevelId" BIGINT,
    "amount" DECIMAL(15,2) NOT NULL,
    "profitPercent" DECIMAL(5,2) NOT NULL,
    "totalProfit" DECIMAL(15,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ProfitDistributionStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unilevel_profit_distributions_pkey" PRIMARY KEY ("id")
);

-- Criar foreign keys para unilevel_profit_distributions se não existirem
DO $$ BEGIN
    ALTER TABLE "unilevel_profit_distributions" ADD CONSTRAINT "unilevel_profit_distributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "unilevel_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_profit_distributions" ADD CONSTRAINT "unilevel_profit_distributions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_profit_distributions" ADD CONSTRAINT "unilevel_profit_distributions_careerLevelId_fkey" FOREIGN KEY ("careerLevelId") REFERENCES "career_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela unilevel_user_career se não existir
CREATE TABLE IF NOT EXISTS "unilevel_user_career" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "careerId" BIGINT NOT NULL,
    "totalNetworkPoints" INTEGER NOT NULL,
    "validPoints" INTEGER NOT NULL,
    "maxTeamVolumePercent" DECIMAL(5,2) NOT NULL,
    "graduatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unilevel_user_career_pkey" PRIMARY KEY ("id")
);

-- Criar foreign keys para unilevel_user_career se não existirem
DO $$ BEGIN
    ALTER TABLE "unilevel_user_career" ADD CONSTRAINT "unilevel_user_career_userId_fkey" FOREIGN KEY ("userId") REFERENCES "unilevel_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "unilevel_user_career" ADD CONSTRAINT "unilevel_user_career_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "career_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
