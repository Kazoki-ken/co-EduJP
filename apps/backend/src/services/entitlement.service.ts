import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { GrantSource, Tier } from '@prisma/client';

/**
 * What a user is allowed to do, and how much of it they have used today.
 *
 * Every quota check in the app goes through this module. Two rules keep it
 * honest:
 *
 *   1. The tier is read from the database on each check, never from the JWT.
 *      A token minted before an upgrade (or before an expiry) would otherwise
 *      keep granting the old tier for its whole 15-minute life.
 *   2. Limits are read from SiteConfiguration with the constants below as
 *      fallbacks, so pricing and quotas can be tuned from the admin panel
 *      without a deploy.
 */

// ─── Limit shape ──────────────────────────────────────────────────────────────

export interface TierLimits {
  /** Game sessions per day. `null` = unlimited. */
  dailyGames: number | null;
  /** AI chat messages per day. `null` = unlimited. */
  dailyAiMessages: number | null;
  /** Topics the user may own in their personal library. `null` = unlimited. */
  maxTopics: number | null;
  /** Words allowed inside one of their topics. `null` = unlimited. */
  maxWordsPerTopic: number | null;
  /**
   * Total saved (SRS) words. `null` = unlimited.
   *
   * A soft ceiling: high enough that a casual learner never meets it, low
   * enough that someone building a serious deck does. Saving is what feeds the
   * review queue, so this is set generously on purpose — the point is not to
   * ration studying.
   */
  maxSavedWords: number | null;
  /** Pronunciation (TTS) plays per day. `null` = unlimited. */
  dailyTts: number | null;
  /** Whether they may publish a book or topic for other learners. */
  canShare: boolean;
}

/**
 * Defaults, used when the matching SiteConfiguration row is absent.
 *
 * SRS review is deliberately absent from this table: the review flow is the
 * product's core loop and is never rationed. A learner who cannot finish
 * today's review loses their streak and does not come back — that costs more
 * than the subscription is worth.
 */
export const DEFAULT_LIMITS: Record<Tier, TierLimits> = {
  FREE: {
    dailyGames: 5,
    dailyAiMessages: 10,
    maxTopics: 3,
    maxWordsPerTopic: 50,
    maxSavedWords: 500,
    dailyTts: 50,
    canShare: false,
  },
  PREMIUM: {
    dailyGames: null,
    dailyAiMessages: 100,
    maxTopics: 30,
    maxWordsPerTopic: 200,
    maxSavedWords: null,
    dailyTts: null,
    canShare: true,
  },
};

/** SiteConfiguration keys, one per tier/limit pair. */
const configKey = (tier: Tier, limit: keyof TierLimits): string =>
  `limit_${tier.toLowerCase()}_${limit}`;

/**
 * Parses a stored config value.
 *
 * An empty string or the literal "unlimited" means no cap, which is how an
 * admin expresses "unlimited" in a text field. A value that is not a number is
 * ignored rather than treated as 0, so a typo cannot lock everyone out.
 */
const parseNumeric = (raw: string | undefined, fallback: number | null): number | null => {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'unlimited' || trimmed === 'cheksiz') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
};

const parseBool = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'ha'].includes(trimmed)) return true;
  if (['false', '0', 'no', "yo'q", 'yoq'].includes(trimmed)) return false;
  return fallback;
};

/** Reads the effective limits for a tier, config overriding the defaults. */
export const getLimits = async (tier: Tier): Promise<TierLimits> => {
  const defaults = DEFAULT_LIMITS[tier];

  let overrides = new Map<string, string>();
  try {
    const rows = await prisma.siteConfiguration.findMany({
      where: { key: { startsWith: `limit_${tier.toLowerCase()}_` } },
    });
    overrides = new Map(rows.map((r) => [r.key, r.value]));
  } catch {
    // Config lookup failed — the defaults above are a safe answer.
    return defaults;
  }

  const get = (limit: keyof TierLimits) => overrides.get(configKey(tier, limit));

  return {
    dailyGames: parseNumeric(get('dailyGames'), defaults.dailyGames),
    dailyAiMessages: parseNumeric(get('dailyAiMessages'), defaults.dailyAiMessages),
    maxTopics: parseNumeric(get('maxTopics'), defaults.maxTopics),
    maxWordsPerTopic: parseNumeric(get('maxWordsPerTopic'), defaults.maxWordsPerTopic),
    maxSavedWords: parseNumeric(get('maxSavedWords'), defaults.maxSavedWords),
    dailyTts: parseNumeric(get('dailyTts'), defaults.dailyTts),
    canShare: parseBool(get('canShare'), defaults.canShare),
  };
};

// ─── Effective tier ───────────────────────────────────────────────────────────

/**
 * The tier a user actually holds right now.
 *
 * A lapsed `premiumUntil` reads as FREE immediately, without waiting for the
 * nightly downgrade job — the cron only tidies the stored column so admin
 * listings stay truthful.
 */
export const effectiveTier = (user: {
  tier: Tier;
  premiumUntil: Date | null;
}): Tier => {
  if (user.tier === 'FREE') return 'FREE';
  if (user.premiumUntil === null) return user.tier; // lifetime
  return user.premiumUntil > new Date() ? user.tier : 'FREE';
};

// ─── Daily rollover ───────────────────────────────────────────────────────────

/**
 * The local calendar day, as a whole number, for a UTC instant.
 *
 * `timezoneOffsetMinutes` is what `Date.prototype.getTimezoneOffset()` returns
 * on the client (minutes WEST of UTC, so Tashkent is -300) and arrives on the
 * `x-timezone-offset` header. Same convention as streak.service.
 */
const localDay = (at: Date, timezoneOffsetMinutes: number): number =>
  Math.floor((at.getTime() - timezoneOffsetMinutes * 60 * 1000) / (24 * 60 * 60 * 1000));

/** True when the stored quota counters belong to an earlier local day. */
const quotaIsStale = (quotaDate: Date | null, timezoneOffsetMinutes: number): boolean => {
  if (!quotaDate) return true;
  return (
    localDay(quotaDate, timezoneOffsetMinutes) < localDay(new Date(), timezoneOffsetMinutes)
  );
};

export interface Entitlements {
  tier: Tier;
  /** null when the grant is lifetime or the user is on the free tier. */
  premiumUntil: Date | null;
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

/**
 * Full entitlement snapshot — tier, limits and today's usage.
 *
 * Stale counters are reported as zero rather than written back, so a plain read
 * never mutates. The reset is persisted by the consume* helpers below, at the
 * moment the allowance is actually spent.
 */
export const getEntitlements = async (
  userId: string,
  timezoneOffsetMinutes = 0,
): Promise<Entitlements> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      premiumUntil: true,
      profile: {
        select: {
          dailyGameCount: true,
          dailyAiCount: true,
          dailyTtsCount: true,
          quotaDate: true,
        },
      },
      _count: { select: { topics: true, savedWords: true } },
    },
  });

  if (!user) throw createError('User not found', 404);

  const tier = effectiveTier(user);
  const limits = await getLimits(tier);
  const stale = quotaIsStale(user.profile?.quotaDate ?? null, timezoneOffsetMinutes);

  return {
    tier,
    premiumUntil: tier === 'FREE' ? null : user.premiumUntil,
    isPremium: tier !== 'FREE',
    limits,
    usage: {
      gamesToday: stale ? 0 : (user.profile?.dailyGameCount ?? 0),
      aiMessagesToday: stale ? 0 : (user.profile?.dailyAiCount ?? 0),
      ttsToday: stale ? 0 : (user.profile?.dailyTtsCount ?? 0),
      topics: user._count.topics,
      savedWords: user._count.savedWords,
    },
  };
};

// ─── Quota guards ─────────────────────────────────────────────────────────────

/**
 * HTTP 402 Payment Required is used for every quota rejection.
 *
 * It is distinct from the 403 an unauthorised action returns, so the frontend
 * can tell "you may not do this at all" apart from "you have used up today's
 * free allowance" and show the upgrade screen only for the latter.
 */
export const QUOTA_STATUS = 402;

const quotaError = (message: string) => createError(message, QUOTA_STATUS);

/**
 * Checks a daily allowance and spends one unit of it in a single write.
 *
 * Counting on *use* rather than on completion is deliberate: a game is
 * generated first and submitted later, and only the generate step is
 * guaranteed to happen — a client that never submits would otherwise get
 * unlimited free sessions.
 *
 * The rollover happens here too, so the counters correct themselves the first
 * time they are touched on a new local day, with no cron involved.
 */
const consumeDaily = async (
  userId: string,
  field: 'dailyGameCount' | 'dailyAiCount' | 'dailyTtsCount',
  limit: number | null,
  timezoneOffsetMinutes: number,
  onExceeded: (limit: number) => never,
): Promise<void> => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      dailyGameCount: true,
      dailyAiCount: true,
      dailyTtsCount: true,
      quotaDate: true,
    },
  });
  if (!profile) throw createError('Profile not found', 404);

  const stale = quotaIsStale(profile.quotaDate, timezoneOffsetMinutes);
  const used = stale ? 0 : profile[field];

  if (limit !== null && used >= limit) onExceeded(limit);

  await prisma.profile.update({
    where: { userId },
    data: stale
      ? {
          // First activity of a new day — reset every counter together so they
          // always describe the same day.
          quotaDate: new Date(),
          dailyGameCount: field === 'dailyGameCount' ? 1 : 0,
          dailyAiCount: field === 'dailyAiCount' ? 1 : 0,
          dailyTtsCount: field === 'dailyTtsCount' ? 1 : 0,
        }
      : { [field]: { increment: 1 } },
  });
};

/**
 * Spends one game from today's allowance, or rejects with 402.
 *
 * Called when a session is generated, not when it is submitted.
 */
export const consumeGameQuota = async (
  userId: string,
  timezoneOffsetMinutes = 0,
): Promise<void> => {
  const { limits } = await getEntitlements(userId, timezoneOffsetMinutes);
  await consumeDaily(userId, 'dailyGameCount', limits.dailyGames, timezoneOffsetMinutes, (n) => {
    throw quotaError(
      `Bugungi bepul o'yin limiti tugadi (${n} ta). ` +
        "Ertaga yangilanadi yoki Premium bilan cheksiz o'ynang. " +
        'Takrorlash (SRS) esa har doim cheksiz.',
    );
  });
};

/** Spends one AI message from today's allowance, or rejects with 402. */
export const consumeChatQuota = async (
  userId: string,
  timezoneOffsetMinutes = 0,
): Promise<void> => {
  const { limits } = await getEntitlements(userId, timezoneOffsetMinutes);
  await consumeDaily(userId, 'dailyAiCount', limits.dailyAiMessages, timezoneOffsetMinutes, (n) => {
    throw quotaError(
      `Bugungi AI suhbat limiti tugadi (${n} ta xabar). ` +
        "Ertaga yangilanadi yoki Premiumga o'ting.",
    );
  });
};

/**
 * Spends one pronunciation play, or rejects with 402.
 *
 * Anonymous listeners are not counted at all — the dictionary is public and the
 * IP rate limiter already covers it. Only signed-in accounts have a tier.
 */
export const consumeTtsQuota = async (
  userId: string,
  timezoneOffsetMinutes = 0,
): Promise<void> => {
  const { limits } = await getEntitlements(userId, timezoneOffsetMinutes);
  await consumeDaily(userId, 'dailyTtsCount', limits.dailyTts, timezoneOffsetMinutes, (n) => {
    throw quotaError(
      `Bugungi talaffuz limiti tugadi (${n} ta). ` +
        "Ertaga yangilanadi yoki Premium bilan cheksiz eshiting.",
    );
  });
};

/**
 * Throws when saving one more word would pass the tier's ceiling.
 *
 * `adding` is how many words the action would save at once — saving a whole
 * topic can add dozens, and checking one at a time would let a batch slip past
 * the limit.
 */
export const assertCanSaveWords = async (userId: string, adding = 1): Promise<void> => {
  const { limits, usage } = await getEntitlements(userId);
  if (limits.maxSavedWords === null) return;

  if (usage.savedWords + adding > limits.maxSavedWords) {
    const room = Math.max(0, limits.maxSavedWords - usage.savedWords);
    throw quotaError(
      `Saqlangan so'zlar chegarasi (${limits.maxSavedWords} ta) to'ldi` +
        (adding > 1 ? ` — bu mavzuni saqlash uchun yana ${adding} ta joy kerak, ${room} ta bo'sh.` : '.') +
        " Premium bilan cheksiz so'z saqlaysiz.",
    );
  }
};

/** Throws when creating one more topic would exceed the tier's allowance. */
export const assertCanCreateTopic = async (userId: string): Promise<void> => {
  const { limits, usage } = await getEntitlements(userId);
  if (limits.maxTopics === null) return;

  if (usage.topics >= limits.maxTopics) {
    throw quotaError(
      `Mavzular soni chegarasiga yetdingiz (${limits.maxTopics} ta). ` +
        'Premium bilan 30 tagacha mavzu yaratasiz.',
    );
  }
};

/** Throws when a topic is already at its tier's word ceiling. */
export const assertCanAddWord = async (userId: string, topicId: string): Promise<void> => {
  const { limits } = await getEntitlements(userId);
  if (limits.maxWordsPerTopic === null) return;

  const count = await prisma.wordTopic.count({ where: { topicId } });
  if (count >= limits.maxWordsPerTopic) {
    throw quotaError(
      `Bu mavzuda so'zlar chegarasiga yetdingiz (${limits.maxWordsPerTopic} ta). ` +
        'Premium bilan mavzuga 200 tagacha so‘z sig‘adi.',
    );
  }
};

/** Throws when a free user tries to publish a book or topic. */
export const assertCanShare = async (userId: string): Promise<void> => {
  const { limits } = await getEntitlements(userId);
  if (!limits.canShare) {
    throw quotaError(
      "Materialni ommaga ochish Premium imkoniyati. Yopiq mavzular bepul va cheksiz.",
    );
  }
};

// ─── Granting ─────────────────────────────────────────────────────────────────

export interface GrantOptions {
  userId: string;
  /** Whole months to add. Omit (or 0) for a lifetime grant. */
  months?: number;
  /** Defaults to ADMIN. Typed from the schema so a new source cannot be missed. */
  source?: GrantSource;
  amount?: number | null;
  externalId?: string | null;
  note?: string | null;
  grantedById?: string | null;
}

/**
 * Gives a user premium and writes the matching ledger row.
 *
 * Renewals extend from whichever is later — the current expiry or now — so
 * paying again a week early adds a month rather than throwing one away. A
 * lifetime grant clears the expiry entirely and can never be shortened by a
 * later monthly one.
 */
export const grantPremium = async (opts: GrantOptions) => {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, tier: true, premiumUntil: true },
  });
  if (!user) throw createError('Foydalanuvchi topilmadi', 404);

  const isLifetime = !opts.months || opts.months <= 0;
  const alreadyLifetime = user.tier !== 'FREE' && user.premiumUntil === null;

  let expiresAt: Date | null = null;
  if (!isLifetime && !alreadyLifetime) {
    const now = new Date();
    const base =
      user.premiumUntil && user.premiumUntil > now ? new Date(user.premiumUntil) : now;
    base.setMonth(base.getMonth() + opts.months!);
    expiresAt = base;
  }

  const [updated, grant] = await prisma.$transaction([
    prisma.user.update({
      where: { id: opts.userId },
      data: { tier: 'PREMIUM', premiumUntil: expiresAt },
      select: { id: true, username: true, tier: true, premiumUntil: true },
    }),
    prisma.premiumGrant.create({
      data: {
        userId: opts.userId,
        tier: 'PREMIUM',
        expiresAt,
        source: opts.source ?? 'ADMIN',
        amount: opts.amount ?? null,
        externalId: opts.externalId ?? null,
        note: opts.note ?? null,
        grantedById: opts.grantedById ?? null,
      },
    }),
  ]);

  return { user: updated, grant };
};

/** Drops a user back to FREE and marks their open grants revoked. */
export const revokePremium = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw createError('Foydalanuvchi topilmadi', 404);

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tier: 'FREE', premiumUntil: null },
      select: { id: true, username: true, tier: true, premiumUntil: true },
    }),
    prisma.premiumGrant.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return updated;
};

/** The grant history for one user, newest first. */
export const listGrants = async (userId: string) =>
  prisma.premiumGrant.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { grantedBy: { select: { id: true, username: true } } },
  });

/**
 * Moves everyone whose subscription has lapsed back to FREE.
 *
 * Purely bookkeeping — `effectiveTier` already treats a past date as free, so
 * a missed run never hands out unpaid access.
 */
export const expireLapsedPremium = async (): Promise<number> => {
  const { count } = await prisma.user.updateMany({
    where: { tier: { not: 'FREE' }, premiumUntil: { not: null, lt: new Date() } },
    data: { tier: 'FREE', premiumUntil: null },
  });
  return count;
};
