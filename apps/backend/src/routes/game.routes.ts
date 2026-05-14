import { Router } from 'express';
import {
  getGameSession,
  postSubmitSession,
  getLeaderboardHandler,
} from '../controllers/game.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET  /api/games/session  — Generate anti-cheat game session
 *   Query params:
 *     type     (TEST | MATCH | WRITE | SHOOTER) default: TEST
 *     topicId  (optional CUID)
 *     bookId   (optional CUID)
 *     limit    (1–50, default 20)
 *     dueOnly  ("true" to only return SRS-due words)
 */
router.get('/session', authenticate, getGameSession);

/**
 * POST /api/games/submit  — Submit answers + trigger SRS + badges
 *   Body: { sessionId: string, answers: [{ wordId, answer }] }
 */
router.post('/submit', authenticate, postSubmitSession);

export default router;
