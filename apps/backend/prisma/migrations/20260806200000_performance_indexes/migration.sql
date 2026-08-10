-- Indexes the query patterns need but nobody had declared.
--
-- All are plain B-trees on columns that are filtered or ordered by. They cost
-- little to maintain and stop these queries degrading into full scans as the
-- tables grow.
--
-- NOT included, deliberately: a pg_trgm GIN index for the dictionary search.
-- It was tried and measured. On ~10 000 words the planner refuses it, and
-- forcing it made the query 22× SLOWER (342 ms against 15 ms for the plain
-- scan) — the table is only ~10 MB, so scanning it beats three bitmap index
-- scans plus a recheck. It would also have to be rewritten on every word
-- insert. Revisit once `words` is in the hundreds of thousands; until then the
-- search is not the bottleneck.

-- ─── Junction table ──────────────────────────────────────────────────────────
-- The primary key is (word_id, topic_id), so filtering by topic_id alone —
-- which every topic listing, save-topic and popular-authors query does — could
-- not use it.
CREATE INDEX IF NOT EXISTS word_topics_topic_id_idx ON "word_topics"("topic_id");

-- ─── Saved content ───────────────────────────────────────────────────────────
-- Same shape: each PK leads with user_id, so looking a row up by the other
-- side (topic completion counts, "who saved this") had no index.
CREATE INDEX IF NOT EXISTS saved_words_word_id_idx ON "saved_words"("word_id");
CREATE INDEX IF NOT EXISTS saved_topics_topic_id_idx ON "saved_topics"("topic_id");
CREATE INDEX IF NOT EXISTS saved_books_book_id_idx ON "saved_books"("book_id");

-- ─── Weekly stats ────────────────────────────────────────────────────────────
-- This table had no index at all beyond its primary key. The leaderboard reads
-- it by start_date on every load, and the league job by (user, week).
CREATE INDEX IF NOT EXISTS weekly_stats_start_date_idx ON "weekly_stats"("start_date");
CREATE INDEX IF NOT EXISTS weekly_stats_user_id_start_date_idx
  ON "weekly_stats"("user_id", "start_date");

-- ─── SRS review queue ────────────────────────────────────────────────────────
-- "words due now, oldest first" — the ordering was being done in memory.
CREATE INDEX IF NOT EXISTS user_word_progress_due_idx
  ON "user_word_progress"("user_id", "next_review_date");

-- ─── Game sessions ───────────────────────────────────────────────────────────
-- Counted per user when badges are evaluated, and swept by age nightly.
CREATE INDEX IF NOT EXISTS game_sessions_user_id_idx ON "game_sessions"("user_id");
CREATE INDEX IF NOT EXISTS game_sessions_created_at_idx ON "game_sessions"("created_at");

-- ─── Authored content ────────────────────────────────────────────────────────
-- The community directory filters public topics by author.
CREATE INDEX IF NOT EXISTS words_author_id_idx ON "words"("author_id");
CREATE INDEX IF NOT EXISTS topics_is_public_idx ON "topics"("is_public") WHERE "is_public" = true;
