-- Word order inside a topic.
--
-- Listings sorted by `words.created_at`, which is the order rows happened to be
-- inserted into the dictionary — not the order a textbook lesson teaches them
-- in. Worse, when an upload links a word that already existed, that word keeps
-- its original timestamp and lands in the wrong place entirely.
--
-- The position belongs to the link rather than the word: the same word can sit
-- at a different place in another topic.

ALTER TABLE "word_topics" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing topics have no recorded order, so fall back to the order
-- the listings were already showing (word creation time, oldest first). This
-- keeps every current topic looking exactly as it does today; only content
-- uploaded from now on carries a real lesson order.
WITH ranked AS (
  SELECT wt."word_id",
         wt."topic_id",
         ROW_NUMBER() OVER (
           PARTITION BY wt."topic_id"
           ORDER BY w."created_at" ASC, wt."word_id" ASC
         ) AS position
  FROM "word_topics" wt
  JOIN "words" w ON w."id" = wt."word_id"
)
UPDATE "word_topics" wt
SET "sort_order" = ranked.position
FROM ranked
WHERE wt."word_id" = ranked."word_id"
  AND wt."topic_id" = ranked."topic_id";

-- Every ordered listing filters by topic first, then sorts.
CREATE INDEX IF NOT EXISTS "word_topics_topic_id_sort_order_idx"
  ON "word_topics"("topic_id", "sort_order");
