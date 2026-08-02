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
 *     limit    (1–200, default 20)
 *     dueOnly  ("true" to only return SRS-due words)
 */
router.get('/session', authenticate, getGameSession);

/**
 * POST /api/games/submit  — Submit answers + trigger SRS + badges
 *   Body: { sessionId: string, answers: [{ wordId, answer }] }  (max 400 answers)
 *
 * Accuracy is scored against the number of words the server put in the session,
 * so skipping words lowers the score rather than inflating it.
 */
router.post('/submit', authenticate, postSubmitSession);

export default router;
