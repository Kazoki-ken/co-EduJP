// ─── Shared API Response Types ────────────────────────────────────────────────

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  _count: {
    topics: number;
    savedBooks: number;
  };
}

export interface Topic {
  id: string;
  name: string;
  bookId: string | null;
  book?: { id: string; title: string } | null;
  _count: {
    wordTopics: number;
  };
}

export interface WordTopic {
  topic: {
    id: string;
    name: string;
    book: { id: string; title: string } | null;
  };
}

export interface KanjiInfo {
  kanji: string;
  meaning: string;
  kunReading: string;
  onReading: string;
  strokes: number;
}

export interface AdditionalExample {
  sentence: string;
  translation: string;
}

export interface CompoundWord {
  word: string;
  hiragana: string;
  meaning: string;
}

export interface Homonym {
  word: string;
  hiragana: string;
  meaning: string;
}

export interface Word {
  id: string;
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  createdAt: string;
  isSaved: boolean;
  wordTopics: WordTopic[];

  // Extended fields
  partOfSpeech?: string | null;
  jlptLevel?: string | null;
  frequency?: string | null;
  pitchAccent?: string | null;
  teForm?: string | null;
  taForm?: string | null;
  naiForm?: string | null;
  masuForm?: string | null;
  kanjiInfo?: KanjiInfo[] | null;
  additionalExamples?: AdditionalExample[] | null;
  synonyms?: string[];
  antonyms?: string[];
  nuance?: string | null;
  compounds?: CompoundWord[] | null;
  homonyms?: Homonym[] | null;
  userNote?: string | null;
}

export interface WordProgress {
  id: string;
  level: number;
  nextReviewDate: string;
  word: {
    id: string;
    japaneseWord: string;
    hiragana: string;
    meaning: string;
  };
}

// ─── Query Params ─────────────────────────────────────────────────────────────

// ─── Game Types ──────────────────────────────────────────────────────────────

export type GameType = 'TEST' | 'MATCH' | 'WRITE' | 'SHOOTER';

export interface SessionWord {
  id: string;
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  wordTopics: WordTopic[];
}

export interface GameSession {
  sessionId: string;
  gameType: GameType;
  expiresAt: string;
  words: SessionWord[];
}

export interface GameAnswer {
  wordId: string;
  answer: string;
  timeMs: number;
}

export interface SrsUpdate {
  wordId: string;
  correct: boolean;
  oldLevel: number;
  newLevel: number;
}

export interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  badgeType: string;
}

export interface GameResult {
  sessionId: string;
  gameType: string;
  /** Words the server put in the session — the denominator for `accuracy`. */
  totalQuestions: number;
  /** Words the player actually attempted (may be lower if they ran out of lives). */
  answeredCount?: number;
  totalCorrect: number;
  accuracy: number;
  xpEarned: number;
  coinsEarned: number;
  badgesEarned: EarnedBadge[];
  srsUpdates: SrsUpdate[];
}

// ─── Word List Query ──────────────────────────────────────────────────────────

export interface WordListParams {
  search?: string;
  topicId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
}
