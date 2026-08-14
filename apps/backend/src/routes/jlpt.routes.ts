import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requirePremium } from '../middleware/premium.middleware';
import {
  getAttemptState,
  getLevel,
  getReviewPaper,
  getSetBriefing,
  getSetTests,
  getTest,
  getTestBriefing,
  patchAnswers,
  postAttempt,
  postFinish,
} from '../controllers/jlpt.controller';

const router = Router();

/**
 * GET /api/jlpt/levels/:level
 * Open to everyone: the catalogue is what sells the section, so free accounts
 * see which tests exist. Only the papers themselves are gated.
 */
router.get('/levels/:level', optionalAuth, getLevel);

/** The briefing shown before a test starts — open, like the catalogue. */
router.get('/tests/:id/info', optionalAuth, getTestBriefing);
router.get('/sets/:id/info', optionalAuth, getSetBriefing);

// ── Everything below needs a premium subscription ──
router.get('/tests/:id', authenticate, requirePremium, getTest);
router.get('/sets/:id', authenticate, requirePremium, getSetTests);
router.post('/attempts', authenticate, requirePremium, postAttempt);
router.get('/attempts/:id', authenticate, requirePremium, getAttemptState);
router.patch('/attempts/:id/answers', authenticate, requirePremium, patchAnswers);
router.post('/attempts/:id/finish', authenticate, requirePremium, postFinish);
router.get('/attempts/:id/review', authenticate, requirePremium, getReviewPaper);

export default router;
