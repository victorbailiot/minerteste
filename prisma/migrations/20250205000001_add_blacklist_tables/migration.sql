-- CreateEnum (idempotente - só cria se não existir)
DO $$ BEGIN
    CREATE TYPE "BlacklistActionType" AS ENUM ('ENTRY_ADDED', 'ENTRY_REMOVED', 'ENTRY_UPDATED', 'ENTRY_EXPIRED', 'ACCESS_BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "blacklist_entries" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100),
    "reason" VARCHAR(1000) NOT NULL,
    "addedBy" BIGINT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "blacklist_audits" (
    "id" BIGSERIAL NOT NULL,
    "actionType" "BlacklistActionType" NOT NULL,
    "performedBy" BIGINT NOT NULL,
    "targetUserId" BIGINT NOT NULL,
    "entryId" BIGINT,
    "resource" VARCHAR(100),
    "action" VARCHAR(100),
    "reason" VARCHAR(1000),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklist_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blacklist_entries_userId_resource_action_key" ON "blacklist_entries"("userId", "resource", "action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blacklist_entries_userId_isActive_idx" ON "blacklist_entries"("userId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blacklist_entries_expiresAt_idx" ON "blacklist_entries"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blacklist_audits_performedBy_createdAt_idx" ON "blacklist_audits"("performedBy", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blacklist_audits_targetUserId_createdAt_idx" ON "blacklist_audits"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blacklist_audits_actionType_createdAt_idx" ON "blacklist_audits"("actionType", "createdAt");

-- AddForeignKey (idempotente)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blacklist_entries_userId_fkey') THEN
        ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blacklist_entries_addedBy_fkey') THEN
        ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blacklist_audits_performedBy_fkey') THEN
        ALTER TABLE "blacklist_audits" ADD CONSTRAINT "blacklist_audits_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blacklist_audits_targetUserId_fkey') THEN
        ALTER TABLE "blacklist_audits" ADD CONSTRAINT "blacklist_audits_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
