-- Adds tokenHashSha256 to RefreshToken for deterministic lookup.
-- Apply to an existing DB once, e.g.:
--   docker exec -i ai_support_postgres psql -U postgres -d ai_support \
--     < docker/postgres/upgrades/2026-04-add_refresh_token_sha256.sql

ALTER TABLE "RefreshToken"
  ADD COLUMN IF NOT EXISTS "tokenHashSha256" TEXT;

-- Existing rows have no SHA-256 yet; revoke them so users sign in again.
UPDATE "RefreshToken"
   SET "revokedAt" = COALESCE("revokedAt", NOW()),
       "tokenHashSha256" = COALESCE("tokenHashSha256", "id"::text)
 WHERE "tokenHashSha256" IS NULL;

ALTER TABLE "RefreshToken"
  ALTER COLUMN "tokenHashSha256" SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = 'RefreshToken_tokenHashSha256_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "RefreshToken_tokenHashSha256_key" ON "RefreshToken"("tokenHashSha256")';
  END IF;
END $$;
