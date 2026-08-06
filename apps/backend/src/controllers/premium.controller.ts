import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import prisma from '../lib/prisma';
import {
  DEFAULT_LIMITS,
  getEntitlements,
  getLimits,
  grantPremium,
  listGrants,
  revokePremium,
} from '../services/entitlement.service';
import {
  approvePayment,
  createCheckout,
  listMyPayments,
  listPending,
  rejectPayment,
} from '../services/payment.service';
import { notifyApproved } from '../services/paymentBot.service';

// ─── Pricing ──────────────────────────────────────────────────────────────────

/**
 * Prices live in SiteConfiguration so they can be changed from the admin panel
 * without a deploy — currency swings and promotions should not need a release.
 * Zero means "not on sale yet", which is how the plans page hides a price.
 */
const PRICE_KEYS = {
  monthly: 'premium_price_monthly',
  yearly: 'premium_price_yearly',
  lifetime: 'premium_price_lifetime',
} as const;

const readPrices = async (): Promise<Record<keyof typeof PRICE_KEYS, number>> => {
  const rows = await prisma.siteConfiguration.findMany({
    where: { key: { in: Object.values(PRICE_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  const read = (key: string) => {
    const value = map.get(key);
    return Number.isFinite(value) && value! > 0 ? Math.floor(value!) : 0;
  };
  return {
    monthly: read(PRICE_KEYS.monthly),
    yearly: read(PRICE_KEYS.yearly),
    lifetime: read(PRICE_KEYS.lifetime),
  };
};

const timezoneOf = (req: AuthenticatedRequest): number => {
  const raw = req.headers['x-timezone-offset'];
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * GET /api/premium/plans
 *
 * What each tier costs and includes. Unauthenticated — this is the sales page.
 */
export const getPlans = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const [free, premium, prices] = await Promise.all([
    getLimits('FREE'),
    getLimits('PREMIUM'),
    readPrices(),
  ]);

  res.json({
    prices,
    tiers: {
      FREE: { limits: free },
      PREMIUM: { limits: premium },
    },
    /** Defaults are exposed so the UI can tell a configured value from a fallback. */
    defaults: DEFAULT_LIMITS,
  });
};

/**
 * GET /api/premium/me
 *
 * The caller's tier, limits and today's usage — what the UI needs to show a
 * progress bar and decide when to nudge towards upgrading.
 */
export const getMyEntitlements = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json(await getEntitlements(req.user!.id, timezoneOf(req)));
};

/** GET /api/premium/me/history — the caller's own grant history. */
export const getMyGrants = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json({ data: await listGrants(req.user!.id) });
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const GrantSchema = z.object({
  /**
   * Whole months to add. 0 or omitted means a lifetime grant, which is how the
   * two purchase shapes the product sells share one endpoint.
   */
  months: z.coerce.number().int().min(0).max(120).optional(),
  amount: z.coerce.number().int().min(0).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});

/**
 * POST /api/admin/users/:id/premium
 *
 * Grants premium manually. This is stage one of the billing plan: payment is
 * collected out of band and an admin records it here. When Payme/Click are
 * wired up their webhook will call the same service with source PAYME/CLICK.
 */
export const postGrantPremium = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = GrantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError(parsed.error.errors[0]?.message ?? "Ma'lumot noto'g'ri", 400);
  }

  const result = await grantPremium({
    userId: req.params.id,
    months: parsed.data.months,
    source: 'ADMIN',
    amount: parsed.data.amount ?? null,
    note: parsed.data.note ?? null,
    grantedById: req.user!.id,
  });

  res.status(201).json(result);
};

/** DELETE /api/admin/users/:id/premium — drop a user back to FREE. */
export const deletePremium = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json(await revokePremium(req.params.id));
};

/** GET /api/admin/users/:id/premium — one user's grant history. */
export const getUserGrants = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json({ data: await listGrants(req.params.id) });
};

// ─── Telegram checkout ────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly', 'lifetime']),
});

/**
 * POST /api/premium/checkout
 *
 * Opens a purchase and returns the Telegram deep link that carries it into the
 * payment bot. The price is frozen onto the request at this moment, so a later
 * price change cannot alter what the buyer was quoted.
 */
export const postCheckout = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Tarif tanlanmadi', 400);
  }

  const checkout = await createCheckout(req.user!.id, parsed.data.plan);
  if (!checkout.deepLink) {
    throw createError(
      "To'lov boti hali sozlanmagan. Administratorga murojaat qiling.",
      503,
    );
  }

  res.status(201).json(checkout);
};

/** GET /api/premium/me/payments — the caller's purchase history. */
export const getMyPayments = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json({ data: await listMyPayments(req.user!.id) });
};

// ─── Admin review ─────────────────────────────────────────────────────────────

/** GET /api/admin/payments — receipts waiting for a decision. */
export const getPendingPayments = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  res.json({ data: await listPending() });
};

/**
 * POST /api/admin/payments/:id/approve
 *
 * The web-panel twin of the bot's Approve button. Both land in the same
 * service call, so a payment can be settled from whichever is at hand.
 */
export const postApprovePayment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const result = await approvePayment(req.params.id, req.user!.id);
  if (!result.alreadyDone) await notifyApproved(req.params.id);
  res.json(result);
};

const RejectSchema = z.object({ reason: z.string().trim().max(300).optional() });

/** POST /api/admin/payments/:id/reject */
export const postRejectPayment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = RejectSchema.safeParse(req.body ?? {});
  res.json(
    await rejectPayment(
      req.params.id,
      req.user!.id,
      parsed.success ? parsed.data.reason : undefined,
    ),
  );
};
