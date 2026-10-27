-- AddColumn
ALTER TABLE "packages"
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "packages_slug_key" ON "packages"("slug");
