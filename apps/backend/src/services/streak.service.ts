import prisma from '../lib/prisma';
import { Profile } from '@prisma/client';

/**
 * Determines if two dates are on the same calendar day (UTC).
 */
const isSameDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

/**
 * Determines if date `a` is exactly yesterday relative to date `b`.
 */
const isYesterday = (a: Date, b: Date): boolean => {
  const yesterday = new Date(b);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(a, yesterday);
};

/**
 * Updates streak on user login and resets daily game counts if needed.
 * - If last login was yesterday → increment streak
 * - If last login was today → no change
 * - If last login was older or null → reset streak to 1
 * - If last_game_date is not today → reset daily game counters
 */
export const updateStreakOnLogin = async (
  userId: string,
  profile: Profile | null,
): Promise<Profile> => {
  const now = new Date();

  // ── Calculate new streak ────────────────────────────────────────────────────
  let newStreak = 1;

  if (profile?.lastLoginDate) {
    if (isSameDay(profile.lastLoginDate, now)) {
      // Already logged in today — preserve streak, no update needed
      return profile;
    } else if (isYesterday(profile.lastLoginDate, now)) {
      // Consecutive day — increment streak
      newStreak = profile.streak + 1;
    } else {
      // Streak broken — reset to 1
      newStreak = 1;
    }
  }

  // ── Reset daily game counts if needed ────────────────────────────────────────
  const shouldResetDaily =
    !profile?.lastGameDate || !isSameDay(profile.lastGameDate, now);

  const updatedProfile = await prisma.profile.update({
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

  return updatedProfile;
};
