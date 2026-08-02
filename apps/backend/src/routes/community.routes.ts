import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import {
  getAuthors,
  getProfile,
  getTopicWords,
} from '../controllers/community.controller';

const router = Router();

/**
 * Browsing other learners' shared books and topics.
 *
 * optionalAuth rather than authenticate: anyone may look, but signing in adds
 * the `isSaved` flags so the save buttons reflect the viewer's own library.
 */
router.use(optionalAuth);

/** GET /api/community/users?search=&page=&limit= — learners who share material */
router.get('/users', getAuthors);

/** GET /api/community/users/:username — profile + their public books/topics */
router.get('/users/:username', getProfile);

/** GET /api/community/topics/:id/words — preview a public topic's words */
router.get('/topics/:id/words', getTopicWords);

export default router;
