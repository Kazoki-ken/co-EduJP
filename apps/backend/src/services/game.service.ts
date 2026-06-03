import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { BadgeType, GameType, League } from '@prisma/client';
import { syncStreakAndDailyCounts } from './streak.service';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * SRS review intervals keyed by level (1–5).
 * Level 1 = brand new word → review in 1 min
 * Level 5 = mastered word → review in 14 days
 */
export const SRS_INTERVALS: Record<number, number> = {
  1: 1 * 60 * 1000,             // 1 minute
  2: 1 * 24 * 60 * 60 * 1000,  // 1 day
  3: 3 * 24 * 60 * 60 * 1000,  // 3 days
  4: 7 * 24 * 60 * 60 * 1000,  // 7 days
  5: 14 * 24 * 60 * 60 * 1000, // 14 days
};

/**
 * How many correct answers are needed to advance one XP tick.
 * Each level requires XP_PER_LEVEL correct answers before levelling up.
 */
const XP_PER_LEVEL = 3;

/**
 * Coin rewards per game type (flat per game, plus per-correct bonus).
 */
const COINS_PER_CORRECT = 2;
const XP_PER_CORRECT = 5;

/** Session expires in 30 minutes — prevents replaying old sessions. */
const SESSION_TTL_MS = 30 * 60 * 1000;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface GenerateSessionOptions {
  userId: string;
  gameType: GameType;
  topicId?: string;
  bookId?: string;
  limit?: number;
  /** If true, only include words due for review right now */
  dueOnly?: boolean;
}

export interface AnswerDto {
  wordId: string;
  answer: string;
}

export interface SubmitSessionDto {
  sessionId: string;
  answers: AnswerDto[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the start (Monday 00:00 UTC) and end (Sunday 23:59:59 UTC) of the
 * current ISO week.
 */
export const getCurrentWeekBounds = (): { start: Date; end: Date } => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);

  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Picks up to `limit` words EXCLUSIVELY from the user's SavedWords list.
 * SRS-due saved words come first; remaining slots are filled randomly
 * from the rest of their saved vocabulary.
 *
 * If the user has fewer than 4 saved words, a friendly error is thrown.
 */
export const generateSession = async (opts: GenerateSessionOptions) => {
  const limit = Math.min(opts.limit ?? 20, 50);
  const now = new Date();
  const MIN_WORDS = 4; // minimum for multiple-choice options

  // ── Get all of the user's saved word IDs ──────────────────────────────────
  const savedWordRecords = await prisma.savedWord.findMany({
    where: { userId: opts.userId },
    select: { wordId: true },
  });
  const savedWordIds = savedWordRecords.map((sw) => sw.wordId);

  if (savedWordIds.length < MIN_WORDS) {
    throw createError(
      `You need at least ${MIN_WORDS} saved words to play. You have ${savedWordIds.length}. Go to the Dictionary and save some words first!`,
      400,
    );
  }

  // ── Pull SRS-due words that are also saved ────────────────────────────────
  const dueProgress = await prisma.userWordProgress.findMany({
    where: {
      userId: opts.userId,
      nextReviewDate: { lte: now },
      wordId: { in: savedWordIds },
    },
    orderBy: { nextReviewDate: 'asc' },
    take: limit,
    include: {
      word: {
        select: {
          id: true,
          japaneseWord: true,
          hiragana: true,
          meaning: true,
          exampleSentence: true,
          exampleTranslation: true,
          wordTopics: {
            include: { topic: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const dueWords = dueProgress.map((p) => p.word);
  const dueWordIds = new Set(dueWords.map((w) => w.id));

  // ── Fill remaining slots from saved words (not already due) ───────────────
  let additionalWords: typeof dueWords = [];
  const remaining = limit - dueWords.length;

  if (remaining > 0 && !opts.dueOnly) {
    const candidates = await prisma.word.findMany({
      where: {
        id: { in: savedWordIds.filter((id) => !dueWordIds.has(id)) },
      },
      take: remaining * 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        japaneseWord: true,
        hiragana: true,
        meaning: true,
        exampleSentence: true,
        exampleTranslation: true,
        wordTopics: {
          include: { topic: { select: { id: true, name: true } } },
        },
      },
    });

    additionalWords = candidates
      .sort(() => Math.random() - 0.5)
      .slice(0, remaining);
  }

  const selectedWords = [...dueWords, ...additionalWords];

  if (selectedWords.length === 0) {
    throw createError(
      'No saved words available for practice. Save some words in the Dictionary first!',
      404,
    );
  }

  // ── Store GameSession (anti-cheat) ────────────────────────────────────────
  const session = await prisma.gameSession.create({
    data: {
      userId: opts.userId,
      wordIds: selectedWords.map((w) => w.id),
      gameType: opts.gameType,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    },
  });

  return {
    sessionId: session.id,
    gameType: opts.gameType,
    expiresAt: session.expiresAt,
    words: selectedWords,
  };
};

// ─── 2. Submit Session + SRS Scoring ─────────────────────────────────────────

/**
 * Validates the session (ownership, not completed, not expired), grades every
 * answer, updates SRS progress, awards XP/coins, updates WeeklyStats, and
 * evaluates badges.
 *
 * Returns a detailed result object including per-word SRS updates.
 */
export const submitSession = async (userId: string, dto: SubmitSessionDto, timezoneOffset: number = 0) => {
  const now = new Date();

  // ── Fetch & validate session ──────────────────────────────────────────────
  const session = await prisma.gameSession.findUnique({
    where: { id: dto.sessionId },
  });

  if (!session) throw createError('Game session not found', 404);
  if (session.userId !== userId) throw createError('Forbidden', 403);
  if (session.completed) throw createError('Session already submitted', 409);
  if (session.expiresAt < now) throw createError('Session expired', 410);

  // Fetch profile to calculate streak and resets based on task completion
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });
  if (!profile) throw createError('Profile not found', 404);

  const currentLocalDay = Math.floor(
    (now.getTime() - timezoneOffset * 60 * 1000) / (24 * 60 * 60 * 1000)
  );

  let newStreak = 1;
  let shouldResetDaily = false;

  if (profile.lastGameDate) {
    const lastGameLocalDay = Math.floor(
      (new Date(profile.lastGameDate).getTime() - timezoneOffset * 60 * 1000) / (24 * 60 * 60 * 1000)
    );

    if (currentLocalDay === lastGameLocalDay) {
      newStreak = profile.streak;
    } else if (currentLocalDay === lastGameLocalDay + 1) {
      newStreak = profile.streak + 1;
      shouldResetDaily = true;
    } else {
      newStreak = 1;
      shouldResetDaily = true;
    }
  } else {
    newStreak = 1;
    shouldResetDaily = true;
  }

  // ── Fetch reference words ─────────────────────────────────────────────────
  const sessionWordIds = session.wordIds;
  const words = await prisma.word.findMany({
    where: { id: { in: sessionWordIds } },
    select: { id: true, japaneseWord: true, hiragana: true, meaning: true },
  });

  const wordMap = new Map(words.map((w) => [w.id, w]));

  // ── Fetch current SRS progress for all words ──────────────────────────────
  const existingProgress = await prisma.userWordProgress.findMany({
    where: { userId, wordId: { in: sessionWordIds } },
  });
  const progressMap = new Map(existingProgress.map((p) => [p.wordId, p]));

  // ── Grade answers & build SRS updates ────────────────────────────────────
  let totalCorrect = 0;
  let totalXp = 0;
  let totalCoins = 0;

  const srsUpdates: Array<{
    wordId: string;
    correct: boolean;
    oldLevel: number;
    newLevel: number;
    oldXp: number;
    newXp: number;
    nextReviewDate: Date;
  }> = [];

  const progressUpserts: Array<ReturnType<typeof prisma.userWordProgress.upsert>> = [];

  for (const answer of dto.answers) {
    // Only grade words that belong to this session
    if (!sessionWordIds.includes(answer.wordId)) continue;

    const word = wordMap.get(answer.wordId);
    if (!word) continue;

    // ── Determine correctness ───────────────────────────────────────────────
    // Case-insensitive check against meaning OR hiragana
    const normalised = answer.answer.trim().toLowerCase();
    const isCorrect =
      word.meaning.toLowerCase().includes(normalised) ||
      normalised.includes(word.meaning.toLowerCase()) ||
      word.hiragana?.toLowerCase() === normalised ||
      word.japaneseWord === answer.answer.trim();

    const current = progressMap.get(answer.wordId);
    const oldLevel = current?.level ?? 1;
    const oldXp = current?.xp ?? 0;

    let newLevel = oldLevel;
    let newXp = oldXp;
    let nextReviewDate: Date;

    if (isCorrect) {
      totalCorrect++;
      totalXp += XP_PER_CORRECT;
      totalCoins += COINS_PER_CORRECT;

      newXp = oldXp + 1;
      if (newXp >= XP_PER_LEVEL && oldLevel < 5) {
        // Level up!
        newLevel = oldLevel + 1;
        newXp = 0;
      } else if (oldLevel === 5) {
        // Already mastered — keep XP capped
        newXp = Math.min(newXp, XP_PER_LEVEL);
      }

      nextReviewDate = new Date(now.getTime() + SRS_INTERVALS[newLevel]);
    } else {
      // Wrong — push back one level, reset XP, immediate review
      newLevel = Math.max(1, oldLevel - 1);
      newXp = 0;
      nextReviewDate = new Date(now.getTime() + SRS_INTERVALS[1]); // 1 min
    }

    srsUpdates.push({
      wordId: answer.wordId,
      correct: isCorrect,
      oldLevel,
      newLevel,
      oldXp,
      newXp,
      nextReviewDate,
    });

    progressUpserts.push(
      prisma.userWordProgress.upsert({
        where: { userId_wordId: { userId, wordId: answer.wordId } },
        create: {
          userId,
          wordId: answer.wordId,
          level: newLevel,
          xp: newXp,
          nextReviewDate,
          lastReviewedAt: now,
        },
        update: {
          level: newLevel,
          xp: newXp,
          nextReviewDate,
          lastReviewedAt: now,
        },
      }),
    );
  }

  const totalQuestions = dto.answers.filter((a) =>
    sessionWordIds.includes(a.wordId),
  ).length;
  const accuracy =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;
  const isPerfect = accuracy === 100 && totalQuestions > 0;

  // ── Run all DB writes in a single transaction ─────────────────────────────
  await prisma.$transaction([
    // Mark session completed
    prisma.gameSession.update({
      where: { id: dto.sessionId },
      data: { completed: true },
    }),

    // Update profile XP + coins + lastGameDate + daily count
    // NOTE: streak is NOT updated here — handled separately below with
    //       goal-threshold logic to keep the transaction clean.
    prisma.profile.update({
      where: { userId },
      data: {
        xp:    { increment: totalXp },
        coins: { increment: totalCoins },
        lastGameDate: now,
        streak: newStreak,
        dailyTestCount:  shouldResetDaily ? (session.gameType === 'TEST'  ? 1 : 0) : (session.gameType === 'TEST'  ? { increment: 1 } : undefined),
        dailyMatchCount: shouldResetDaily ? (session.gameType === 'MATCH' ? 1 : 0) : (session.gameType === 'MATCH' ? { increment: 1 } : undefined),
        dailyWriteCount: shouldResetDaily ? (session.gameType === 'WRITE' ? 1 : 0) : (session.gameType === 'WRITE' ? { increment: 1 } : undefined),
      },
    }),

    // All SRS upserts
    ...progressUpserts,
  ]);

  // ── Update (or create) WeeklyStats ───────────────────────────────────────
  await updateWeeklyStats(userId, {
    wordsLearned: srsUpdates.filter((u) => u.newLevel > u.oldLevel).length,
    gamesPlayed: 1,
    correctAnswers: totalCorrect,
    totalQuestions,
    coinsEarned: totalCoins,
    xpEarned: totalXp,
  });

  // ── Badge evaluation ──────────────────────────────────────────────────────
  const badgesEarned = await evaluateBadges(userId, {
    isPerfectGame: isPerfect,
  });

  return {
    sessionId: dto.sessionId,
    gameType: session.gameType,
    totalQuestions,
    totalCorrect,
    accuracy,
    xpEarned: totalXp,
    coinsEarned: totalCoins,
    badgesEarned,
    srsUpdates,
  };
};



// ─── 3. Weekly Stats Upsert ───────────────────────────────────────────────────

interface WeeklyStatsDelta {
  wordsLearned: number;
  gamesPlayed: number;
  correctAnswers: number;
  totalQuestions: number;
  coinsEarned: number;
  xpEarned: number;
}

/**
 * Finds or creates the WeeklyStat record for the current ISO week and
 * increments all counters atomically.
 */
export const updateWeeklyStats = async (
  userId: string,
  delta: WeeklyStatsDelta,
): Promise<void> => {
  const { start, end } = getCurrentWeekBounds();

  // Try to find an existing stat row for this week
  const existing = await prisma.weeklyStat.findFirst({
    where: {
      userId,
      startDate: start,
    },
  });

  if (existing) {
    await prisma.weeklyStat.update({
      where: { id: existing.id },
      data: {
        wordsLearned: { increment: delta.wordsLearned },
        gamesPlayed: { increment: delta.gamesPlayed },
        correctAnswers: { increment: delta.correctAnswers },
        totalQuestions: { increment: delta.totalQuestions },
        coinsEarned: { increment: delta.coinsEarned },
        xpEarned: { increment: delta.xpEarned },
      },
    });
  } else {
    await prisma.weeklyStat.create({
      data: {
        userId,
        startDate: start,
        endDate: end,
        wordsLearned: delta.wordsLearned,
        gamesPlayed: delta.gamesPlayed,
        correctAnswers: delta.correctAnswers,
        totalQuestions: delta.totalQuestions,
        coinsEarned: delta.coinsEarned,
        xpEarned: delta.xpEarned,
      },
    });
  }
};

// ─── 4. Badge Evaluation ──────────────────────────────────────────────────────

interface BadgeContext {
  /** Pass true when the just-completed session was 100% accurate. */
  isPerfectGame?: boolean;
}

/**
 * Evaluates ALL badge thresholds for the given user and awards any that have
 * been newly reached. Already-earned badges are skipped.
 *
 * Returns an array of newly awarded Badge objects.
 */
export const evaluateBadges = async (
  userId: string,
  ctx: BadgeContext = {},
) => {
  // ── Fetch all badges + already-earned ones ────────────────────────────────
  const [allBadges, earnedBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    }),
  ]);

  const earnedIds = new Set(earnedBadges.map((ub) => ub.badgeId));
  const unearnedBadges = allBadges.filter((b) => !earnedIds.has(b.id));

  if (unearnedBadges.length === 0) return [];

  // ── Fetch user stats needed for evaluation ────────────────────────────────
  const [profile, savedWordCount, gamesPlayedCount, masteredWordCount] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.savedWord.count({ where: { userId } }),
      prisma.gameSession.count({ where: { userId, completed: true } }),
      prisma.userWordProgress.count({ where: { userId, level: 5 } }),
    ]);

  const streak = profile?.streak ?? 0;

  // ── Check each badge ──────────────────────────────────────────────────────
  const newlyEarned: typeof allBadges = [];

  for (const badge of unearnedBadges) {
    let qualifies = false;

    switch (badge.badgeType as BadgeType) {
      case 'STREAK':
        qualifies = streak >= badge.threshold;
        break;

      case 'WORDS_SAVED':
        qualifies = savedWordCount >= badge.threshold;
        break;

      case 'GAMES_PLAYED':
        qualifies = gamesPlayedCount >= badge.threshold;
        break;

      case 'PERFECT_GAME':
        // threshold = 1 means "earn at least 1 perfect game"
        qualifies = ctx.isPerfectGame === true && badge.threshold <= 1;
        break;

      case 'MASTER_WORDS':
        qualifies = masteredWordCount >= badge.threshold;
        break;

      case 'COINS_EARNED':
        qualifies = (profile?.coins ?? 0) >= badge.threshold;
        break;

      case 'WORDS_REVIEWED': {
        const totalReviewed = await prisma.userWordProgress.count({
          where: { userId },
        });
        qualifies = totalReviewed >= badge.threshold;
        break;
      }

      default:
        break;
    }

    if (qualifies) {
      newlyEarned.push(badge);
    }
  }

  // ── Persist newly earned badges ───────────────────────────────────────────
  if (newlyEarned.length > 0) {
    await prisma.userBadge.createMany({
      data: newlyEarned.map((b) => ({
        userId,
        badgeId: b.id,
      })),
      skipDuplicates: true,
    });
  }

  return newlyEarned;
};

// ─── 5. Leaderboard ───────────────────────────────────────────────────────────

/**
 * Returns the current week's leaderboard for a given league tier,
 * sorted by (coinsEarned + xpEarned * 2) descending.
 */
export const getLeaderboard = async (league?: League) => {
  const { start } = getCurrentWeekBounds();

  const stats = await prisma.weeklyStat.findMany({
    where: {
      startDate: start,
      ...(league && {
        user: { profile: { league } },
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profile: {
            select: { streak: true, coins: true, xp: true, league: true },
          },
        },
      },
    },
    orderBy: [{ coinsEarned: 'desc' }, { xpEarned: 'desc' }],
    take: 100,
  });

  return stats.map((s, index) => ({
    rank: index + 1,
    userId: s.userId,
    username: s.user.username,
    league: s.user.profile?.league,
    streak: s.user.profile?.streak ?? 0,
    weeklyCoins: s.coinsEarned,
    weeklyXp: s.xpEarned,
    weeklyGames: s.gamesPlayed,
    score: s.coinsEarned + s.xpEarned * 2,
  }));
};
