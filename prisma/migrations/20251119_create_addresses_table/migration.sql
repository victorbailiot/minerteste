-- Create addresses table (PostgreSQL)
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  "street" VARCHAR(255) NOT NULL,
  "number" VARCHAR(50) NOT NULL,
  "complement" VARCHAR(255),
  "neighborhood" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255) NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "postalCode" VARCHAR(20) NOT NULL,
  "country" VARCHAR(2) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'addresses_userId_fkey'
  ) THEN
    ALTER TABLE "addresses"
    ADD CONSTRAINT "addresses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Useful index
CREATE INDEX IF NOT EXISTS "addresses_user_active_default_idx" ON "addresses"("userId", "isActive", "isDefault");

-- Trigger to auto-update updatedAt
CREATE OR REPLACE FUNCTION set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_addresses_updated_at ON "addresses";
CREATE TRIGGER set_addresses_updated_at
BEFORE UPDATE ON "addresses"
FOR EACH ROW
EXECUTE FUNCTION set_current_timestamp_updated_at();


