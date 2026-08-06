/**
 * Round plan for the MIXED game — the combined review mode.
 *
 * A run is always MIXED_ROUNDS rounds long and each round is randomly one of
 * TEST, MATCH or WRITE. The plan is built HERE, on the server, and derived
 * purely from the session's word list, so:
 *
 *   - the client is told what to render, but cannot choose it;
 *   - `submitSession` rebuilds the identical plan from `session.wordIds` at
 *     grading time without needing a new database column;
 *   - a word is never asked in both directions inside one run, because the
 *     pool is split into a "write" bucket and an "everything else" bucket
 *     before any round is dealt.
 *
 * That last point matters: grading merges every answer for a word, so a word
 * that appeared once as WRITE (type the Japanese) and once as TEST (pick the
 * meaning) could never be marked correct in both.
 */

// ─── Shape of a run ───────────────────────────────────────────────────────────

/** Fixed and deliberately not configurable — the mode has no setup screen. */
export const MIXED_ROUNDS = 20;

/** Pairs dealt into a MATCH round when the pool is big enough. */
export const MATCH_ROUND_PAIRS = 4;

/** Below this a MATCH round has nothing to match, so it becomes a TEST round. */
const MIN_MATCH_PAIRS = 2;

/** How many saved words to pull for a run. Cycled if the learner has fewer. */
export const MIXED_POOL_TARGET = 40;

/** Roughly a third of the pool is reserved for WRITE rounds. */
const WRITE_BUCKET_RATIO = 1 / 3;

export type MixedRoundKind = 'TEST' | 'MATCH' | 'WRITE';

export interface MixedRound {
  /** 0-based position in the run. */
  index: number;
  kind: MixedRoundKind;
  /** One word for TEST/WRITE, several for MATCH. */
  wordIds: string[];
}

export interface MixedPlan {
  rounds: MixedRound[];
  /** Words dealt into WRITE rounds — these grade as `toJapanese`. */
  writeWordIds: string[];
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
// Deterministic so the plan can be rebuilt at submit time. The seed is the word
// list itself, which the server already shuffled when it built the session.

const hashSeed = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 — small, fast, good enough for dealing rounds. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffled = <T>(items: T[], rand: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

// ─── Plan construction ────────────────────────────────────────────────────────

/**
 * Builds the round plan for a session's word pool.
 *
 * Buckets are consumed with a wrapping cursor, so a short pool simply repeats
 * words across rounds rather than cutting the run short — 20 rounds always
 * means 20 rounds, even for a learner with only four saved words.
 */
export const buildMixedPlan = (wordIds: string[]): MixedPlan => {
  if (wordIds.length === 0) return { rounds: [], writeWordIds: [] };

  const rand = seededRandom(hashSeed(wordIds.join('|')));
  const pool = shuffled(wordIds, rand);

  // Split before dealing so no word can land in both direction classes.
  const writeCount =
    pool.length < 2 ? 0 : Math.max(1, Math.round(pool.length * WRITE_BUCKET_RATIO));
  const writeWords = pool.slice(0, writeCount);
  const otherWords = pool.slice(writeCount);

  const matchSize = Math.min(MATCH_ROUND_PAIRS, otherWords.length);
  const canMatch = matchSize >= MIN_MATCH_PAIRS;
  const canWrite = writeWords.length > 0;

  let writeCursor = 0;
  let otherCursor = 0;

  /** Takes `count` consecutive, distinct words from a bucket, wrapping around. */
  const take = (bucket: string[], cursor: number, count: number): [string[], number] => {
    const picked: string[] = [];
    let next = cursor;
    for (let i = 0; i < count; i++) {
      picked.push(bucket[next % bucket.length]!);
      next++;
    }
    return [picked, next % bucket.length];
  };

  const rounds: MixedRound[] = [];

  for (let index = 0; index < MIXED_ROUNDS; index++) {
    const roll = rand();
    let kind: MixedRoundKind = roll < 1 / 3 ? 'TEST' : roll < 2 / 3 ? 'MATCH' : 'WRITE';

    // Fall back to TEST when the pool cannot support the drawn kind.
    if (kind === 'MATCH' && !canMatch) kind = 'TEST';
    if (kind === 'WRITE' && !canWrite) kind = 'TEST';

    if (kind === 'WRITE') {
      const [picked, next] = take(writeWords, writeCursor, 1);
      writeCursor = next;
      rounds.push({ index, kind, wordIds: picked });
      continue;
    }

    const count = kind === 'MATCH' ? matchSize : 1;
    const [picked, next] = take(otherWords, otherCursor, count);
    otherCursor = next;
    rounds.push({ index, kind, wordIds: picked });
  }

  return { rounds, writeWordIds: writeWords };
};

/**
 * The distinct words a plan actually asks about.
 *
 * This — not the whole pool — is the denominator for accuracy: the session may
 * carry 40 words while a 20-round run only reaches half of them.
 */
export const askedWordIds = (plan: MixedPlan): Set<string> =>
  new Set(plan.rounds.flatMap((r) => r.wordIds));
