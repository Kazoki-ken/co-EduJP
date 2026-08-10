import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isAnswerCorrect, normaliseAnswer, acceptedAnswers } from './answerCheck';

/**
 * Grading is the one piece of logic that exists in three copies — here, in the
 * web client and in the mobile client — so that a game can show instant
 * feedback that matches the server's verdict. These tests pin the behaviour
 * and, at the end, check that the copies have not drifted apart.
 */

const word = {
  japaneseWord: '維持',
  hiragana: 'いじ',
  meaning: 'saqlab turish, ushlab turish (muhofaza qilish)',
};

describe('normaliseAnswer', () => {
  it('folds the several apostrophes Uzbek uses into one', () => {
    const forms = ["so'z", 'so‘z', 'soʻz', 'soʼz', 'so`z'];
    const normalised = forms.map(normaliseAnswer);
    expect(new Set(normalised).size).toBe(1);
  });

  it('folds katakana onto hiragana so either script is accepted', () => {
    expect(normaliseAnswer('コーヒー')).toBe(normaliseAnswer('こーひー'));
  });

  it('folds half-width katakana through NFKC', () => {
    expect(normaliseAnswer('ｺｰﾋｰ')).toBe(normaliseAnswer('コーヒー'));
  });

  it('collapses whitespace and strips punctuation', () => {
    expect(normaliseAnswer('  salom ,  dunyo!  ')).toBe('salom dunyo');
  });
});

describe('isAnswerCorrect — asking for the meaning', () => {
  it('accepts the whole gloss', () => {
    expect(isAnswerCorrect(word, word.meaning)).toBe(true);
  });

  it('accepts one comma-separated part', () => {
    expect(isAnswerCorrect(word, 'ushlab turish')).toBe(true);
  });

  it('accepts a part with its parenthetical stripped off', () => {
    // "ushlab turish (muhofaza qilish)" also passes as just "ushlab turish".
    expect(isAnswerCorrect(word, 'ushlab turish')).toBe(true);
  });

  it('does NOT accept the text inside the parentheses on its own', () => {
    // Documented behaviour: parentheticals are clarifications, not synonyms.
    // Worth revisiting — a learner answering "muhofaza qilish" is arguably
    // right — but changing it would loosen grading everywhere, so it is
    // pinned here rather than silently altered.
    expect(isAnswerCorrect(word, 'muhofaza qilish')).toBe(false);
  });

  it('accepts the Japanese or its reading too', () => {
    expect(isAnswerCorrect(word, '維持')).toBe(true);
    expect(isAnswerCorrect(word, 'いじ')).toBe(true);
  });

  it('rejects a blank answer', () => {
    // The shooter sends an empty string when a word flies past unanswered.
    expect(isAnswerCorrect(word, '')).toBe(false);
    expect(isAnswerCorrect(word, '   ')).toBe(false);
  });

  it('rejects a single letter that merely appears in the gloss', () => {
    // The old substring implementation marked this correct.
    expect(isAnswerCorrect(word, 'a')).toBe(false);
    expect(isAnswerCorrect(word, 'sa')).toBe(false);
  });

  it('rejects a different word', () => {
    expect(isAnswerCorrect(word, 'mushuk')).toBe(false);
  });
});

describe('isAnswerCorrect — asking for the Japanese', () => {
  it('accepts kanji, hiragana and katakana', () => {
    expect(isAnswerCorrect(word, '維持', 'toJapanese')).toBe(true);
    expect(isAnswerCorrect(word, 'いじ', 'toJapanese')).toBe(true);
    expect(isAnswerCorrect(word, 'イジ', 'toJapanese')).toBe(true);
  });

  it('refuses the meaning — that is the prompt itself', () => {
    expect(isAnswerCorrect(word, word.meaning, 'toJapanese')).toBe(false);
    expect(isAnswerCorrect(word, 'ushlab turish', 'toJapanese')).toBe(false);
  });

  it('offers only the Japanese forms as accepted answers', () => {
    expect(acceptedAnswers(word, 'toJapanese')).toEqual(new Set(['維持', 'いじ']));
  });
});

describe('the three copies have not drifted', () => {
  /**
   * Compares the executable part of each file, ignoring the header comment
   * (which differs by design) and line endings (the repo mixes LF and CRLF).
   */
  const body = (path: string) => {
    const src = readFileSync(join(__dirname, path), 'utf8').replace(/\r\n/g, '\n');
    const start = src.indexOf('export interface GradableWord');
    expect(start, `marker not found in ${path}`).toBeGreaterThan(-1);
    return src.slice(start).trim();
  };

  it('backend, frontend and mobile grade identically', () => {
    const backend = body('answerCheck.ts');
    expect(body('../../../../apps/frontend/lib/answerCheck.ts')).toBe(backend);
    expect(body('../../../../apps/mobile/src/utils/answerCheck.ts')).toBe(backend);
  });
});
