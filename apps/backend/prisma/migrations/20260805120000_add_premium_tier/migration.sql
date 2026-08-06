-- Premium tier: FREE / PREMIUM, plus the grant ledger behind it.

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "Tier" AS ENUM ('FREE', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrantSource" AS ENUM ('ADMIN', 'PAYME', 'CLICK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Users ───────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" "Tier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_until" TIMESTAMP(3);

-- ─── Daily quota counters ────────────────────────────────────────────────────
-- Separate from the existing per-game-type counters, which only cover
-- TEST/MATCH/WRITE and are used for the dashboard's daily goals.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "daily_game_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "daily_ai_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "quota_date" TIMESTAMP(3);

-- ─── Grant ledger ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "premium_grants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'PREMIUM',
    "expires_at" TIMESTAMP(3),
    "source" "GrantSource" NOT NULL DEFAULT 'ADMIN',
    "amount" INTEGER,
    "external_id" TEXT,
    "note" TEXT,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "premium_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "premium_grants_external_id_key" ON "premium_grants"("external_id");
CREATE INDEX IF NOT EXISTS "premium_grants_user_id_idx" ON "premium_grants"("user_id");

ALTER TABLE "premium_grants"
  DROP CONSTRAINT IF EXISTS "premium_grants_user_id_fkey";
ALTER TABLE "premium_grants"
  ADD CONSTRAINT "premium_grants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "premium_grants"
  DROP CONSTRAINT IF EXISTS "premium_grants_granted_by_id_fkey";
ALTER TABLE "premium_grants"
  ADD CONSTRAINT "premium_grants_granted_by_id_fkey"
  FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
