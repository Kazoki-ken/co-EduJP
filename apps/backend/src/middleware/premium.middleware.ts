import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { createError } from './error.middleware';
import prisma from '../lib/prisma';
import { effectiveTier } from '../services/entitlement.service';

/**
 * Gate for features that are premium-only outright, rather than quota-limited.
 *
 * Games and AI chat let free accounts in and cap how much they may use; the
 * JLPT mock exams are the first thing that is closed to them entirely, so the
 * check is a middleware rather than a quota call. It answers 402 with a
 * learner-facing message, the same status the quota path uses, so the frontend
 * has one place to react.
 */
export const requirePremium = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) return next(createError('Avval tizimga kiring', 401));

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { tier: true, premiumUntil: true },
  });
  if (!user) return next(createError('Foydalanuvchi topilmadi', 404));

  // `tier` can be stale between the nightly downgrade job runs, so the date is
  // what actually decides.
  if (effectiveTier(user) === 'FREE') {
    return next(
      createError('Bu boʻlim faqat Premium obuna bilan ochiladi', 402),
    );
  }

  return next();
};
