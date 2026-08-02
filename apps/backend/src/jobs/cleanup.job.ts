import cron from 'node-cron';
import prisma from '../lib/prisma';

/**
 * Removes rows that are no longer usable:
 *  - refresh tokens past their expiry, and revoked tokens older than a day
 *    (the extra day keeps the rotation grace window and reuse detection honest)
 *  - expired Telegram auth sessions
 *  - completed or expired game sessions older than 30 days
 */
export const runCleanup = async (): Promise<void> => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [expiredTokens, staleRevoked, authSessions, gameSessions] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.refreshToken.deleteMany({ where: { revokedAt: { lt: oneDayAgo } } }),
    prisma.authSession.deleteMany({ where: { expiresAt: { lt: oneDayAgo } } }),
    prisma.gameSession.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  console.log(
    `[Cleanup] refresh tokens: ${expiredTokens.count} expired, ${staleRevoked.count} revoked | ` +
      `auth sessions: ${authSessions.count} | game sessions: ${gameSessions.count}`,
  );
};

/** Schedules the cleanup for 03:15 UTC every day. */
export const registerCleanupJob = (): void => {
  cron.schedule(
    '15 3 * * *',
    async () => {
      try {
        await runCleanup();
      } catch (err) {
        console.error('[Cleanup] ❌ Job failed:', err);
      }
    },
    { timezone: 'UTC' },
  );

  console.log('🧹 Daily cleanup job registered (03:15 UTC)');
};
