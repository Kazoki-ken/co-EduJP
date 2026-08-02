/**
 * Answer grading for the vocabulary games.
 *
 * The previous implementation graded with a two-way substring test:
 *
 *   meaning.includes(answer) || answer.includes(meaning)
 *
 * which marked almost anything correct — a single letter like "a" is a
 * substring of nearly every Uzbek gloss, and an empty answer (what the shooter
 * game sends on a miss) is a substring of everything.
 *
 * This module instead normalises both sides and requires an exact match against
 * one of the accepted variants.
 *
 * IMPORTANT: apps/frontend/lib/answerCheck.ts and
 * apps/mobile/src/utils/answerCheck.ts are deliberate copies of this file so
 * the instant feedback shown while playing matches the server's verdict. Keep
 * the three in sync.
 */

export interface GradableWord {
  japaneseWord: string;
  hiragana?: string | null;
  meaning: string;
}

/**
 * Lowercases, strips punctuation/diacritic apostrophes and collapses spaces.
 *
 * Uzbek uses several apostrophe characters interchangeably (' ' ʻ ʼ `), e.g.
 * "so'z" / "soʻz" / "so`z", so they are all normalised to a plain "'".
 */
export const normaliseAnswer = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[.,;:!?"“”()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Builds every string that counts as a correct answer for a word.
 *
 * A meaning like "saqlab turish, ushlab turish (muhofaza qilish)" accepts:
 *   - the whole string
 *   - "saqlab turish"
 *   - "ushlab turish"
 *   - "muhofaza qilish"
 * plus the Japanese spelling and its hiragana reading.
 */
export const acceptedAnswers = (word: GradableWord): Set<string> => {
  const variants = new Set<string>();

  const add = (value?: string | null) => {
    if (!value) return;
    const normalised = normaliseAnswer(value);
    if (normalised) variants.add(normalised);
  };

  add(word.japaneseWord);
  add(word.hiragana);
  add(word.meaning);

  // Split multi-gloss meanings on commas, semicolons and slashes.
  for (const part of word.meaning.split(/[,;/|]/)) {
    add(part);
    // Also accept the gloss with any parenthetical clarification removed.
    add(part.replace(/\([^)]*\)/g, ' '));
  }

  // And the full meaning without parentheticals.
  add(word.meaning.replace(/\([^)]*\)/g, ' '));

  return variants;
};

/**
 * Grades a single answer. Blank answers are always wrong — the shooter game
 * sends an empty string when the player lets a word fly past.
 */
export const isAnswerCorrect = (word: GradableWord, answer: string): boolean => {
  const submitted = normaliseAnswer(answer ?? '');
  if (!submitted) return false;

  return acceptedAnswers(word).has(submitted);
};
