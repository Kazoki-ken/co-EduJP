import prisma from '../lib/prisma';
import { Profile } from '@prisma/client';

/**
 * Checks if the user's streak is broken or if daily counts need resetting based on lastGameDate.
 * This is called on loginUser and getMe (profile fetch).
 *
 * Rules:
 *  - If lastGameDate is null -> streak is 0, no resets needed.
 *  - If currentLocalDay === lastGameLocalDay -> they already played today, streak preserved.
 *  - If currentLocalDay === lastGameLocalDay + 1 -> it's a new day, they haven't played yet today but played yesterday.
 *    Streak is preserved (waiting for today's task completion). If their daily counts aren't reset yet, reset them.
 *  - If currentLocalDay > lastGameLocalDay + 1 -> they missed yesterday completely. Streak resets to 0!
 *    Daily counts reset to 0.
 */
export const syncStreakAndDailyCounts = async (
  userId: string,
  timezoneOffsetMinutes: number = 0,
): Promise<Profile | null> => {
  const now = new Date();

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return null;
  }

  const currentLocalDay = Math.floor(
    (now.getTime() - timezoneOffsetMinutes * 60 * 1000) / (24 * 60 * 60 * 1000)
  );

  let newStreak = profile.streak;
  let shouldResetDaily = false;
  let shouldUpdate = false;

  if (profile.lastGameDate) {
    const lastGameLocalDay = Math.floor(
      (new Date(profile.lastGameDate).getTime() - timezoneOffsetMinutes * 60 * 1000) / (24 * 60 * 60 * 1000)
    );

    if (currentLocalDay === lastGameLocalDay) {
      // Already active today, nothing to change
    } else if (currentLocalDay === lastGameLocalDay + 1) {
      // New day, consecutive streak is still active (waiting for today's game).
      // We only reset daily counts if they are not already 0.
      if (profile.dailyTestCount > 0 || profile.dailyMatchCount > 0 || profile.dailyWriteCount > 0) {
        shouldResetDaily = true;
        shouldUpdate = true;
      }
    } else {
      // Gap day — missed yesterday. Streak resets to 0!
      newStreak = 0;
      shouldResetDaily = true;
      shouldUpdate = true;
    }
  } else {
    // Never played a game — streak must be 0.
    if (profile.streak > 0) {
      newStreak = 0;
      shouldUpdate = true;
    }
    if (profile.dailyTestCount > 0 || profile.dailyMatchCount > 0 || profile.dailyWriteCount > 0) {
      shouldResetDaily = true;
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    return await prisma.profile.update({
      where: { userId },
      data: {
        streak: newStreak,
        lastLoginDate: now,
        ...(shouldResetDaily && {
          dailyTestCount: 0,
          dailyMatchCount: 0,
          dailyWriteCount: 0,
        }),
      },
    });
  }

  // Still update lastLoginDate on every login/profile fetch to keep it accurate
  return await prisma.profile.update({
    where: { userId },
    data: { lastLoginDate: now },
  });
};

/**
 * Backwards compatible wrapper for login services.
 */
export const updateStreakOnLogin = async (
  userId: string,
  profile: Profile | null,
  timezoneOffsetMinutes: number = 0,
): Promise<Profile> => {
  const updated = await syncStreakAndDailyCounts(userId, timezoneOffsetMinutes);
  if (!updated) {
    throw new Error('Profile not found');
  }
  return updated;
};
