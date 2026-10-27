-- CreateTable
CREATE TABLE "clube300_members" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "packageType" VARCHAR(50) NOT NULL,
    "cotas" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clube300_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clube300_members_userId_key" ON "clube300_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clube300_members_memberNumber_key" ON "clube300_members"("memberNumber");

-- AddForeignKey
ALTER TABLE "clube300_members" ADD CONSTRAINT "clube300_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old columns from users table if they exist
ALTER TABLE "users" DROP COLUMN IF EXISTS "isClube300Member";
ALTER TABLE "users" DROP COLUMN IF EXISTS "clube300JoinedAt";

-- Add comments for documentation
COMMENT ON TABLE "clube300_members" IS 'Tabela otimizada para os membros do Clube dos 300 - máximo 300 registros';
COMMENT ON COLUMN "clube300_members"."memberNumber" IS 'Número sequencial do membro (1-300)';
COMMENT ON COLUMN "clube300_members"."packageType" IS 'Tipo do pacote: Núcleo ou Tecton';
COMMENT ON COLUMN "clube300_members"."cotas" IS 'Número de cotas: 1 para Núcleo, 2 para Tecton';
