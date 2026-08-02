-- Extended word fields + per-user word notes.
--
-- These columns were originally pushed to the running database with
-- `prisma db push` before this migration file was committed, so every statement
-- is written to be idempotent. Otherwise `prisma migrate deploy` would abort
-- with "column already exists" the first time it runs against production.

-- AlterTable
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "additional_examples" JSONB;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "antonyms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "compounds" JSONB;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "frequency" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "jlpt_level" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "kanji_info" JSONB;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "masu_form" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "nai_form" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "nuance" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "part_of_speech" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "pitch_accent" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "ta_form" TEXT;
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "te_form" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_word_notes" (
    "user_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_word_notes_pkey" PRIMARY KEY ("user_id","word_id")
);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_word_notes"
    ADD CONSTRAINT "user_word_notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_word_notes"
    ADD CONSTRAINT "user_word_notes_word_id_fkey"
    FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
