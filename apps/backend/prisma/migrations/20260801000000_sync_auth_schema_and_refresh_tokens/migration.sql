-- ─────────────────────────────────────────────────────────────────────────────
-- Sync migration.
--
-- Earlier schema changes (Google OAuth, Telegram phone auth, the `homonyms`
-- word column) were applied to the running database with `prisma db push`, so
-- they never made it into the migration history. A fresh `migrate deploy` would
-- therefore build a database that does not match schema.prisma.
--
-- Every statement below is idempotent so this migration is safe both on a fresh
-- database and on the production database that already has most of it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── users: social login + phone login columns ───────────────────────────────
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_key" ON "users"("telegram_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id");

-- ── words: homonyms column ──────────────────────────────────────────────────
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "homonyms" JSONB;

-- ── auth_sessions: Telegram phone verification ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AuthSessionStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "telegram_id" TEXT,
    "status" "AuthSessionStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_key" ON "auth_sessions"("token");

DO $$ BEGIN
  ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── refresh_tokens: revocable sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

DO $$ BEGIN
  ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
