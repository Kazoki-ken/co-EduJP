// ─── Subscription ─────────────────────────────────────────────────────────────

export type Tier = 'FREE' | 'PREMIUM';

/** `null` on any numeric limit means unlimited. */
export interface TierLimits {
  dailyGames: number | null;
  dailyAiMessages: number | null;
  maxTopics: number | null;
  maxWordsPerTopic: number | null;
  maxSavedWords: number | null;
  dailyTts: number | null;
  canShare: boolean;
}

export interface Entitlements {
  tier: Tier;
  /** null for a lifetime grant or a free account. */
  premiumUntil: string | null;
  isPremium: boolean;
  limits: TierLimits;
  usage: {
    gamesToday: number;
    aiMessagesToday: number;
    ttsToday: number;
    topics: number;
    savedWords: number;
  };
}

export interface PremiumPlans {
  /** Amounts in so'm; 0 means "not on sale yet" and is hidden by the UI. */
  prices: { monthly: number; yearly: number; lifetime: number };
  tiers: Record<Tier, { limits: TierLimits }>;
  defaults: Record<Tier, TierLimits>;
}

export type PlanId = 'monthly' | 'yearly' | 'lifetime';

export interface CheckoutResponse {
  id: string;
  plan: PlanId;
  amount: number;
  botUsername: string;
  /** Telegram deep link that carries the purchase into the payment bot. */
  deepLink: string;
  expiresAt: string;
}

export interface PremiumGrant {
  id: string;
  tier: Tier;
  expiresAt: string | null;
  source: 'ADMIN' | 'PAYME' | 'CLICK';
  amount: number | null;
  note: string | null;
  createdAt: string;
  revokedAt: string | null;
  grantedBy: { id: string; username: string } | null;
}

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
  /** Derived server-side; a lapsed subscription reads as false. */
  isPremium: boolean;
  publicTopics: number;
  publicBooks: number;
  /** Only present on the `sort=popular` listing: saves by other learners. */
  saves?: number;
}

export interface CommunityProfile {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
    isPremium: boolean;
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
    /**
     * Only the single-word endpoint sends this. The list endpoint used to ship
     * it with every row and no screen ever read it, so it was dropped there.
     */
    book?: { id: string; title: string } | null;
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
  isSaved: boolean;
  /** Absent on a `compact` listing, which sends only the four fields above. */
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  createdAt?: string;
  wordTopics?: WordTopic[];

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

export type GameType = 'TEST' | 'MATCH' | 'WRITE' | 'SHOOTER' | 'BLOCKS' | 'MIXED';

/** One round of a MIXED run. The server deals these; the client only renders. */
export type MixedRoundKind = 'TEST' | 'MATCH' | 'WRITE';

export interface MixedRound {
  index: number;
  kind: MixedRoundKind;
  /** One word for TEST/WRITE, several for MATCH. */
  wordIds: string[];
}

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
  /** Present only for MIXED — the server's fixed 20-round plan. */
  rounds?: MixedRound[];
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
  /**
   * Asks for only the fields a result row shows. Roughly a third of the full
   * payload — use it wherever the extended fields are not rendered.
   */
  compact?: boolean;
}
