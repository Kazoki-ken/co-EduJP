import { describe, it, expect } from 'vitest';
import { buildMixedPlan, askedWordIds, MIXED_ROUNDS } from './mixedPlan';

/**
 * The MIXED plan is rebuilt from scratch at grading time, from the stored word
 * list alone. Everything here protects that contract: if the plan stopped being
 * reproducible, or a word could land in both direction buckets, answers would
 * be graded against a different game than the one that was played.
 */

const pool = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`);

describe('buildMixedPlan', () => {
  it('always deals exactly MIXED_ROUNDS rounds', () => {
    for (const size of [4, 8, 20, 40, 200]) {
      expect(buildMixedPlan(pool(size)).rounds).toHaveLength(MIXED_ROUNDS);
    }
  });

  it('is reproducible — the same pool gives the same plan', () => {
    const a = buildMixedPlan(pool(40));
    const b = buildMixedPlan(pool(40));
    expect(a).toEqual(b);
  });

  it('gives a different plan for a different pool', () => {
    const a = JSON.stringify(buildMixedPlan(pool(40)).rounds.map((r) => r.kind));
    const b = JSON.stringify(buildMixedPlan(pool(41)).rounds.map((r) => r.kind));
    expect(a).not.toBe(b);
  });

  it('never puts one word in both direction buckets', () => {
    // A word asked once as WRITE and once as TEST could never be right in both,
    // because grading merges every answer for a word.
    for (const size of [4, 7, 20, 40]) {
      const plan = buildMixedPlan(pool(size));
      const writeWords = new Set(plan.writeWordIds);
      for (const round of plan.rounds) {
        for (const id of round.wordIds) {
          expect(writeWords.has(id)).toBe(round.kind === 'WRITE');
        }
      }
    }
  });

  it('deals distinct words inside a MATCH round', () => {
    // Two identical tiles would be unmatchable.
    for (const size of [4, 5, 9, 40]) {
      for (const round of buildMixedPlan(pool(size)).rounds) {
        if (round.kind === 'MATCH') {
          expect(new Set(round.wordIds).size).toBe(round.wordIds.length);
          expect(round.wordIds.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('gives TEST and WRITE rounds exactly one word', () => {
    for (const round of buildMixedPlan(pool(40)).rounds) {
      if (round.kind !== 'MATCH') expect(round.wordIds).toHaveLength(1);
    }
  });

  it('survives the four-word minimum a learner can start with', () => {
    const plan = buildMixedPlan(pool(4));
    expect(plan.rounds).toHaveLength(MIXED_ROUNDS);
    expect(plan.rounds.every((r) => r.wordIds.length > 0)).toBe(true);
  });

  it('returns nothing for an empty pool rather than throwing', () => {
    expect(buildMixedPlan([])).toEqual({ rounds: [], writeWordIds: [] });
  });

  it('uses a mix of kinds on a healthy pool', () => {
    const kinds = new Set(buildMixedPlan(pool(40)).rounds.map((r) => r.kind));
    expect(kinds.size).toBeGreaterThan(1);
  });
});

describe('askedWordIds', () => {
  it('counts only the words the rounds actually reached', () => {
    const plan = buildMixedPlan(pool(40));
    const asked = askedWordIds(plan);
    const fromRounds = new Set(plan.rounds.flatMap((r) => r.wordIds));
    expect(asked).toEqual(fromRounds);
    // A 20-round run cannot reach more words than a 40-word pool holds.
    expect(asked.size).toBeLessThanOrEqual(40);
  });
});
