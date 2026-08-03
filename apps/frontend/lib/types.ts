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
  /** null for official content; a user id for learner-created books. */
  authorId?: string | null;
  isPublic?: boolean;
  isSaved?: boolean;
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
  /** null for official content; a user id for learner-created topics. */
  authorId?: string | null;
  isPublic?: boolean;
  isSaved?: boolean;
  _count: {
    wordTopics: number;
  };
}

// ─── My Library (user-created content) ────────────────────────────────────────

export interface LibraryBook {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { topics: number };
}

export interface LibraryTopic {
  id: string;
  name: string;
  bookId: string | null;
  isPublic: boolean;
  book: { id: string; title: string } | null;
  _count: { wordTopics: number };
}

export interface LibraryWord {
  id: string;
  japaneseWord: string;
  hiragana: string | null;
  meaning: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
}

export interface LibrarySummary {
  bookCount: number;
  topicCount: number;
  wordCount: number;
  publicTopics: number;
}

// ─── Community (other learners' shared content) ───────────────────────────────

export interface CommunityAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  publicTopics: number;
  publicBooks: number;
}

export interface CommunityProfile {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
    streak: number;
    xp: number;
    league: string;
    publicTopics: number;
    publicBooks: number;
    totalWords: number;
  };
  books: Book[];
  topics: Topic[];
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

export type GameType = 'TEST' | 'MATCH' | 'WRITE' | 'SHOOTER' | 'BLOCKS';

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
