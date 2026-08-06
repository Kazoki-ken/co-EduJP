-- Combined review mode (TEST + MATCH + WRITE in one 20-round run).
--
-- Postgres 12+ allows ALTER TYPE ... ADD VALUE inside a transaction as long as
-- the new value is not used in that same transaction, which is why this
-- migration only declares it. IF NOT EXISTS keeps it re-runnable.

ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'MIXED';
