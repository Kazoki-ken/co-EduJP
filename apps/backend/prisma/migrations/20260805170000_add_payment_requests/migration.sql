-- Telegram bot purchases: receipt in, admin approval, premium out.

-- ─── Enums ───────────────────────────────────────────────────────────────────
ALTER TYPE "GrantSource" ADD VALUE IF NOT EXISTS 'TELEGRAM';

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM
    ('PENDING', 'AWAITING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Daily TTS quota counter ─────────────────────────────────────────────────
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "daily_tts_count" INTEGER NOT NULL DEFAULT 0;

-- ─── Purchases ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "payment_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "link_token" TEXT NOT NULL,
    "telegram_user_id" TEXT,
    "telegram_chat_id" TEXT,
    "receipt_file_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "grant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_requests_link_token_key" ON "payment_requests"("link_token");
CREATE INDEX IF NOT EXISTS "payment_requests_user_id_idx" ON "payment_requests"("user_id");
CREATE INDEX IF NOT EXISTS "payment_requests_status_idx" ON "payment_requests"("status");

ALTER TABLE "payment_requests" DROP CONSTRAINT IF EXISTS "payment_requests_user_id_fkey";
ALTER TABLE "payment_requests"
  ADD CONSTRAINT "payment_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_requests" DROP CONSTRAINT IF EXISTS "payment_requests_reviewed_by_id_fkey";
ALTER TABLE "payment_requests"
  ADD CONSTRAINT "payment_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
