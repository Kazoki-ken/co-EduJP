import cron from 'node-cron';
import prisma from '../lib/prisma';
import { getCurrentWeekBounds } from '../services/game.service';
import { League, Prisma } from '@prisma/client';

// ─── League Order ─────────────────────────────────────────────────────────────

const LEAGUE_ORDER: League[] = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
];

const leagueIndex = (l: League) => LEAGUE_ORDER.indexOf(l);
const promoteLeague = (l: League): League =>
  LEAGUE_ORDER[Math.min(leagueIndex(l) + 1, LEAGUE_ORDER.length - 1)];
const demoteLeague = (l: League): League =>
  LEAGUE_ORDER[Math.max(leagueIndex(l) - 1, 0)];

// ─── Core Job Logic ───────────────────────────────────────────────────────────

/**
 * Processes weekly league promotions and demotions.
 *
 * Algorithm (per league tier):
 *  1. Fetch all users in this league with their weekly stats score.
 *  2. Sort by score = coinsEarned + xpEarned * 2 (descending).
 *  3. Top 20% → promote (unless already DIAMOND).
 *  4. Bottom 20% → demote (unless already BRONZE).
 *  5. Persist changes + write a LeagueLog entry.
 *  6. Bootstrap new WeeklyStat rows for the coming week.
 */
export const processLeagueReset = async (): Promise<void> => {
  const now = new Date();
  // The "current" week bounds are the PREVIOUS week (we run at start of new week)
  const prevWeekEnd = new Date(now);
  prevWeekEnd.setUTCMilliseconds(-1); // 1ms before now = end of last week

  // Compute last week's Monday
  const dayOfWeek = prevWeekEnd.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setUTCDate(prevWeekEnd.getUTCDate() + diffToMonday);
  prevWeekStart.setUTCHours(0, 0, 0, 0);

  console.log(
    `[LeagueReset] Processing week ${prevWeekStart.toISOString()} → ${prevWeekEnd.toISOString()}`,
  );

  // ── Idempotency guard ─────────────────────────────────────────────────────
  const alreadyProcessed = await prisma.leagueLog.findFirst({
    where: { weekStart: prevWeekStart },
  });

  if (alreadyProcessed) {
    console.log('[LeagueReset] Already processed this week — skipping.');
    return;
  }

  let totalPromotions = 0;
  let totalDemotions = 0;
  const details: Record<string, unknown> = {};

  // ── Process each league tier ──────────────────────────────────────────────
  for (const league of LEAGUE_ORDER) {
    // Fetch profiles in this league
    const profiles = await prisma.profile.findMany({
      where: { league },
      select: { userId: true },
    });

    if (profiles.length === 0) {
      details[league] = { users: 0, promoted: 0, demoted: 0 };
      continue;
    }

    const userIds = profiles.map((p) => p.userId);

    // Fetch weekly stats for the previous week
    const weeklyStats = await prisma.weeklyStat.findMany({
      where: {
        userId: { in: userIds },
        startDate: prevWeekStart,
      },
      select: {
        userId: true,
        coinsEarned: true,
        xpEarned: true,
      },
    });

    // Build score map (users with no stats get score 0)
    const scoreMap = new Map<string, number>(
      weeklyStats.map((s) => [s.userId, s.coinsEarned + s.xpEarned * 2]),
    );

    // Sort users by score descending
    const sorted = userIds
      .map((id) => ({ id, score: scoreMap.get(id) ?? 0 }))
      .sort((a, b) => b.score - a.score);

    const count = sorted.length;
    const promotionCut = Math.max(1, Math.floor(count * 0.2));
    const demotionCut = Math.max(1, Math.floor(count * 0.2));

    const toPromote =
      league !== 'DIAMOND' ? sorted.slice(0, promotionCut).map((u) => u.id) : [];
    const toDemote =
      league !== 'BRONZE'
        ? sorted
            .slice(Math.max(0, count - demotionCut))
            .map((u) => u.id)
            // Don't demote users who are also being promoted (edge case: tiny leagues)
            .filter((id) => !toPromote.includes(id))
        : [];

    // Promote
    if (toPromote.length > 0) {
      await prisma.profile.updateMany({
        where: { userId: { in: toPromote } },
        data: { league: promoteLeague(league) },
      });
      totalPromotions += toPromote.length;
    }

    // Demote
    if (toDemote.length > 0) {
      await prisma.profile.updateMany({
        where: { userId: { in: toDemote } },
        data: { league: demoteLeague(league) },
      });
      totalDemotions += toDemote.length;
    }

    details[league] = {
      users: count,
      promoted: toPromote.length,
      demoted: toDemote.length,
      topScore: sorted[0]?.score ?? 0,
    };

    console.log(
      `[LeagueReset] ${league}: ${count} users | ↑${toPromote.length} promoted | ↓${toDemote.length} demoted`,
    );
  }

  // ── Bootstrap WeeklyStat rows for new week ────────────────────────────────
  const { start: newStart, end: newEnd } = getCurrentWeekBounds();

  const allUsers = await prisma.user.findMany({ select: { id: true } });

  // Only create rows for users who don't already have one for this week
  const existingNewWeek = await prisma.weeklyStat.findMany({
    where: { startDate: newStart },
    select: { userId: true },
  });
  const existingIds = new Set(existingNewWeek.map((s) => s.userId));
  const newStatUsers = allUsers.filter((u) => !existingIds.has(u.id));

  if (newStatUsers.length > 0) {
    await prisma.weeklyStat.createMany({
      data: newStatUsers.map((u) => ({
        userId: u.id,
        startDate: newStart,
        endDate: newEnd,
      })),
      skipDuplicates: true,
    });
    console.log(`[LeagueReset] Bootstrapped ${newStatUsers.length} new WeeklyStat rows.`);
  }

  // ── Write LeagueLog ───────────────────────────────────────────────────────
  await prisma.leagueLog.create({
    data: {
      weekStart: prevWeekStart,
      promotionsCount: totalPromotions,
      demotionsCount: totalDemotions,
      detailsJson: details as Prisma.InputJsonValue,
    },
  });

  console.log(
    `[LeagueReset] ✅ Done. Total promotions: ${totalPromotions}, demotions: ${totalDemotions}`,
  );
};

// ─── Register Cron Schedule ───────────────────────────────────────────────────

/**
 * Schedules the league reset job to run every Monday at 00:00 UTC.
 * Called from src/index.ts on server startup.
 */
export const registerLeagueResetJob = (): void => {
  // '0 0 * * 1' = At 00:00 on Monday (UTC)
  cron.schedule(
    '0 0 * * 1',
    async () => {
      try {
        await processLeagueReset();
      } catch (err) {
        console.error('[LeagueReset] ❌ Job failed:', err);
      }
    },
    { timezone: 'UTC' },
  );

  console.log('📅 Weekly league reset job registered (every Monday 00:00 UTC)');
};
