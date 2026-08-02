// ─── Game Types ───────────────────────────────────────────────────────────────

import type { WordTopic } from './vocabulary';

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
