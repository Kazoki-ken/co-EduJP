import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPlans,
  getMyEntitlements,
  getMyGrants,
  getMyPayments,
  postCheckout,
} from '../controllers/premium.controller';

const router = Router();

/**
 * GET /api/premium/plans
 * Public — what each tier costs and includes. Drives the pricing page.
 */
router.get('/plans', getPlans);

/**
 * GET /api/premium/me
 * The caller's tier, limits and today's usage.
 *
 * The UI reads limits from here rather than hardcoding them, so changing a
 * quota in the admin panel updates every screen at once.
 */
router.get('/me', authenticate, getMyEntitlements);

/** GET /api/premium/me/history — the caller's own grants. */
router.get('/me/history', authenticate, getMyGrants);

/** GET /api/premium/me/payments — the caller's purchase attempts. */
router.get('/me/payments', authenticate, getMyPayments);

/**
 * POST /api/premium/checkout
 * Body: { plan: 'monthly' | 'yearly' | 'lifetime' }
 *
 * Returns a Telegram deep link. The buyer pays by card transfer and sends the
 * receipt to the bot; an admin approves it there and premium is granted.
 */
router.post('/checkout', authenticate, postCheckout);

export default router;
