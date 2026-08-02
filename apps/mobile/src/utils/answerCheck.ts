/**
 * Client-side mirror of apps/backend/src/utils/answerCheck.ts.
 *
 * The games show instant "correct / wrong" feedback before the session is
 * submitted, so this must produce exactly the same verdict as the server.
 * If you change one, change all three (backend, frontend, mobile).
 */

export interface GradableWord {
  japaneseWord: string;
  hiragana?: string | null;
  meaning: string;
}

/** Lowercases, strips punctuation and unifies Uzbek apostrophe variants. */
export const normaliseAnswer = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[.,;:!?"“”()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Every string that counts as a correct answer for a word. */
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

  for (const part of word.meaning.split(/[,;/|]/)) {
    add(part);
    add(part.replace(/\([^)]*\)/g, ' '));
  }

  add(word.meaning.replace(/\([^)]*\)/g, ' '));

  return variants;
};

/** Grades a single answer. Blank answers are always wrong. */
export const isAnswerCorrect = (word: GradableWord, answer: string): boolean => {
  const submitted = normaliseAnswer(answer ?? '');
  if (!submitted) return false;

  return acceptedAnswers(word).has(submitted);
};
