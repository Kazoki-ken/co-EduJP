/**
 * Client-side mirror of apps/backend/src/utils/answerCheck.ts.
 *
 * The games show instant correct/wrong feedback before the session is
 * submitted, so this must produce exactly the same verdict as the server.
 * If you change one, change all three (backend, frontend, mobile).
 */

export interface GradableWord {
  japaneseWord: string;
  hiragana?: string | null;
  meaning: string;
}

/**
 * Which way round the question was asked.
 *
 *  - `toMeaning`  — the game showed the Japanese and wants the Uzbek meaning
 *                   (TEST, MATCH, SHOOTER).
 *  - `toJapanese` — the game showed the Uzbek meaning and wants the Japanese
 *                   word (WRITE). Typing the meaning back must NOT pass here,
 *                   otherwise the prompt itself would be the answer.
 */
export type AnswerDirection = 'toMeaning' | 'toJapanese';

/**
 * Folds katakana onto hiragana so either script is accepted: a learner asked
 * for コーヒー may type こーひー, and both are the same word.
 *
 * The two syllabaries sit at a fixed 0x60 offset in Unicode
 * (U+30A1–U+30F6 katakana ↔ U+3041–U+3096 hiragana). The prolonged sound mark
 * ー (U+30FC) has no hiragana counterpart and is left alone on both sides.
 */
const foldKana = (value: string): string =>
  value.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );

/**
 * Lowercases, strips punctuation/diacritic apostrophes, collapses spaces and
 * folds katakana to hiragana.
 *
 * Uzbek uses several apostrophe characters interchangeably (' ' ʻ ʼ `), e.g.
 * "so'z" / "soʻz" / "so`z", so they are all normalised to a plain "'".
 *
 * NFKC also folds half-width katakana (ｺｰﾋｰ) into full-width first, so those
 * reach foldKana in a comparable shape.
 */
export const normaliseAnswer = (value: string): string =>
  foldKana(
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[‘’ʻʼ`´]/g, "'")
      .replace(/[.,;:!?"“”()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

/**
 * Builds every string that counts as a correct answer for a word, given which
 * way the question was asked.
 *
 * Asking for the Japanese accepts the written form and its reading — kanji,
 * hiragana or katakana all match, since foldKana has levelled the two kana
 * scripts.
 *
 * Asking for the meaning is looser, because a gloss like
 * "saqlab turish, ushlab turish (muhofaza qilish)" has several valid answers:
 * the whole string, each comma/semicolon/slash-separated part, and each part
 * with its parenthetical removed.
 */
export const acceptedAnswers = (
  word: GradableWord,
  direction: AnswerDirection = 'toMeaning',
): Set<string> => {
  const variants = new Set<string>();

  const add = (value?: string | null) => {
    if (!value) return;
    const normalised = normaliseAnswer(value);
    if (normalised) variants.add(normalised);
  };

  add(word.japaneseWord);
  add(word.hiragana);

  if (direction === 'toJapanese') return variants;

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
export const isAnswerCorrect = (
  word: GradableWord,
  answer: string,
  direction: AnswerDirection = 'toMeaning',
): boolean => {
  const submitted = normaliseAnswer(answer ?? '');
  if (!submitted) return false;

  return acceptedAnswers(word, direction).has(submitted);
};
