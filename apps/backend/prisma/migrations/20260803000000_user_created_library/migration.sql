-- ─────────────────────────────────────────────────────────────────────────────
-- User-created library.
--
-- Learners can now build their own books and topics. Ownership is expressed by
-- author_id: NULL means official, admin-curated content (every existing row),
-- anything else means it belongs to that user. is_public decides whether other
-- learners can find it through the author's profile.
--
-- words.is_user_created is deliberately separate from words.author_id: bulk
-- uploads already stamp author_id with the importing admin, so author_id alone
-- cannot distinguish official words from ones a learner typed in.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── books ───────────────────────────────────────────────────────────────────
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "author_id" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "books_author_id_idx" ON "books"("author_id");

DO $$ BEGIN
  ALTER TABLE "books"
    ADD CONSTRAINT "books_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── topics ──────────────────────────────────────────────────────────────────
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "author_id" TEXT;
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "topics_author_id_idx" ON "topics"("author_id");

DO $$ BEGIN
  ALTER TABLE "topics"
    ADD CONSTRAINT "topics_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── words ───────────────────────────────────────────────────────────────────
ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "is_user_created" BOOLEAN NOT NULL DEFAULT false;

-- Partial index: the dictionary always filters on is_user_created = false, and
-- user words are the rare case, so only that subset needs indexing.
CREATE INDEX IF NOT EXISTS "words_is_user_created_idx" ON "words"("is_user_created")
  WHERE "is_user_created" = true;
