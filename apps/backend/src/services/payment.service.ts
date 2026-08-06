import crypto from 'crypto';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { grantPremium } from './entitlement.service';

/**
 * Buying premium through the Telegram bot.
 *
 * The money never touches this system: the buyer transfers it to a card and
 * sends a photo of the receipt, an admin looks at it and approves. This module
 * owns the state machine around that exchange; the bot is only its interface.
 *
 * Splitting it this way means the same approve/reject calls can later be driven
 * by a Payme or Click webhook without the bot being involved at all.
 */

// ─── Plans ────────────────────────────────────────────────────────────────────

export type PlanId = 'monthly' | 'yearly' | 'lifetime';

/** Months granted per plan. 0 means lifetime. */
export const PLAN_MONTHS: Record<PlanId, number> = {
  monthly: 1,
  yearly: 12,
  lifetime: 0,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  monthly: '1 oy',
  yearly: '1 yil',
  lifetime: 'Umrbod',
};

const PRICE_KEYS: Record<PlanId, string> = {
  monthly: 'premium_price_monthly',
  yearly: 'premium_price_yearly',
  lifetime: 'premium_price_lifetime',
};

/** Card details shown to the buyer, set from the admin panel. */
export interface PaymentDetails {
  cardNumber: string;
  cardHolder: string;
}

const readConfig = async (keys: string[]): Promise<Map<string, string>> => {
  const rows = await prisma.siteConfiguration.findMany({ where: { key: { in: keys } } });
  return new Map(rows.map((r) => [r.key, r.value.trim()]));
};

export const getPaymentDetails = async (): Promise<PaymentDetails> => {
  const cfg = await readConfig(['payment_card_number', 'payment_card_holder']);
  return {
    cardNumber: cfg.get('payment_card_number') ?? '',
    cardHolder: cfg.get('payment_card_holder') ?? '',
  };
};

export const getPlanPrice = async (plan: PlanId): Promise<number> => {
  const cfg = await readConfig([PRICE_KEYS[plan]]);
  const value = Number(cfg.get(PRICE_KEYS[plan]));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

// ─── Checkout ─────────────────────────────────────────────────────────────────

/** A pending purchase is only good for this long before it is abandoned. */
const CHECKOUT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Starts a purchase and returns the deep link that carries it into the bot.
 *
 * The token is 32 random bytes rather than the request id: it travels through
 * a Telegram deep link in the clear, and whoever holds it gets to attach a
 * receipt to this purchase. base64url keeps it inside Telegram's `?start=`
 * character set and 64-character limit.
 *
 * The price is copied onto the row here so that editing prices in the admin
 * panel can never change what an in-flight buyer was quoted.
 */
export const createCheckout = async (userId: string, plan: PlanId) => {
  const amount = await getPlanPrice(plan);
  if (amount <= 0) {
    throw createError(
      "Bu tarif hozircha sotuvda emas — administrator narxni belgilamagan.",
      400,
    );
  }

  // One open checkout per user keeps the admin chat clean and stops a buyer
  // from accumulating half-finished purchases they might each send a receipt for.
  await prisma.paymentRequest.updateMany({
    where: { userId, status: { in: ['PENDING', 'AWAITING'] } },
    data: { status: 'EXPIRED' },
  });

  const request = await prisma.paymentRequest.create({
    data: {
      userId,
      plan,
      months: PLAN_MONTHS[plan],
      amount,
      linkToken: crypto.randomBytes(32).toString('base64url'),
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    },
  });

  const botUsername = (process.env.PAYMENT_BOT_USERNAME ?? '').replace(/^@/, '');

  return {
    id: request.id,
    plan,
    amount,
    botUsername,
    deepLink: botUsername
      ? `https://t.me/${botUsername}?start=${request.linkToken}`
      : null,
    expiresAt: request.expiresAt,
  };
};

/** Resolves a deep-link token to its purchase, or null when it is unusable. */
export const findByToken = async (token: string) => {
  const request = await prisma.paymentRequest.findUnique({
    where: { linkToken: token },
    include: { user: { select: { id: true, username: true } } },
  });

  if (!request) return null;
  if (request.status === 'APPROVED' || request.status === 'REJECTED') return null;
  if (request.expiresAt < new Date()) {
    await prisma.paymentRequest.update({
      where: { id: request.id },
      data: { status: 'EXPIRED' },
    });
    return null;
  }
  return request;
};

/** Records that the buyer opened the bot and is being shown the card details. */
export const markAwaitingReceipt = async (
  id: string,
  telegramUserId: string,
  telegramChatId: string,
) =>
  prisma.paymentRequest.update({
    where: { id },
    data: { status: 'AWAITING', telegramUserId, telegramChatId },
  });

/** The purchase this Telegram chat is currently expected to send a receipt for. */
export const findAwaitingForChat = async (telegramChatId: string) =>
  prisma.paymentRequest.findFirst({
    where: { telegramChatId, status: 'AWAITING', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true } } },
  });

/** Attaches the receipt photo and puts the purchase in front of an admin. */
export const attachReceipt = async (id: string, fileId: string) =>
  prisma.paymentRequest.update({
    where: { id },
    data: { status: 'SUBMITTED', receiptFileId: fileId },
    include: { user: { select: { id: true, username: true, email: true, phone: true } } },
  });

// ─── Review ───────────────────────────────────────────────────────────────────

export const getRequest = async (id: string) =>
  prisma.paymentRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, phone: true } },
      reviewedBy: { select: { id: true, username: true } },
    },
  });

/**
 * Approves a purchase and grants the premium it paid for.
 *
 * Guarded against double approval: two admins tapping the button at the same
 * time, or Telegram delivering the same callback twice, must not stack two
 * grants onto one payment. The status check is what makes the operation
 * idempotent, so `alreadyDone` is a normal outcome rather than an error.
 */
export const approvePayment = async (id: string, reviewerId: string | null) => {
  const request = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!request) throw createError("To'lov so'rovi topilmadi", 404);

  if (request.status === 'APPROVED') {
    return { alreadyDone: true as const, request };
  }
  if (request.status === 'REJECTED') {
    throw createError("Bu so'rov allaqachon rad etilgan", 409);
  }

  const { grant } = await grantPremium({
    userId: request.userId,
    months: request.months,
    source: 'TELEGRAM',
    amount: request.amount,
    note: `Telegram to'lov — ${PLAN_LABELS[request.plan as PlanId] ?? request.plan}`,
    grantedById: reviewerId,
  });

  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      grantId: grant.id,
    },
    include: { user: { select: { id: true, username: true } } },
  });

  return { alreadyDone: false as const, request: updated, grant };
};

export const rejectPayment = async (
  id: string,
  reviewerId: string | null,
  reason?: string,
) => {
  const request = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!request) throw createError("To'lov so'rovi topilmadi", 404);
  if (request.status === 'APPROVED') {
    throw createError("Bu so'rov allaqachon tasdiqlangan", 409);
  }

  return prisma.paymentRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      rejectReason: reason ?? null,
    },
    include: { user: { select: { id: true, username: true } } },
  });
};

/** Purchases waiting on an admin, newest first — for the admin panel. */
export const listPending = async () =>
  prisma.paymentRequest.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

/** A user's own purchase history. */
export const listMyPayments = async (userId: string) =>
  prisma.paymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

/** Marks abandoned checkouts expired. Called from the nightly cleanup. */
export const expireStaleCheckouts = async (): Promise<number> => {
  const { count } = await prisma.paymentRequest.updateMany({
    where: {
      status: { in: ['PENDING', 'AWAITING'] },
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
  return count;
};
