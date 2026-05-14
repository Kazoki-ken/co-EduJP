// ─── User & Profile Types ─────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN';

export type League = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface UserProfile {
  streak: number;
  lastLoginDate: string | null;
  coins: number;
  xp: number;
  league: League;
  dailyTestCount: number;
  dailyMatchCount: number;
  dailyWriteCount: number;
  lastGameDate: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  profile: UserProfile | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  badgeType: string;
  threshold: number;
}

export interface UserBadge {
  earnedAt: string;
  badge: Badge;
}

export interface UserProgress {
  dueToday: WordProgressEntry[];
  levelBreakdown: LevelCount[];
  totalWords: number;
}

export interface WordProgressEntry {
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

export interface LevelCount {
  level: number;
  count: number;
}
