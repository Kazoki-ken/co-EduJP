import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSummary,
  getBooks,
  postBook,
  patchBook,
  removeBook,
  getTopics,
  postTopic,
  patchTopic,
  removeTopic,
  getTopicWords,
  postTopicWord,
  patchWord,
  removeWord,
} from '../controllers/library.controller';

const router = Router();

/**
 * "Mening lug'atim" — the learner's own books, topics and words.
 *
 * Every route is scoped to the authenticated user; the service layer re-checks
 * ownership on each id so nothing here can touch another learner's material.
 */
router.use(authenticate);

/** GET /api/library/summary — counts for the library landing screen */
router.get('/summary', getSummary);

/**
 * GET    /api/library/books      — my books
 * POST   /api/library/books      — create a book
 * PATCH  /api/library/books/:id  — rename / re-describe / change visibility
 * DELETE /api/library/books/:id  — delete (its topics survive, unparented)
 */
router.get('/books', getBooks);
router.post('/books', postBook);
router.patch('/books/:id', patchBook);
router.delete('/books/:id', removeBook);

/**
 * GET    /api/library/topics       — my topics (optional ?bookId=)
 * POST   /api/library/topics       — create a topic
 * PATCH  /api/library/topics/:id   — rename / move / change visibility
 * DELETE /api/library/topics/:id   — delete, along with its own words
 */
router.get('/topics', getTopics);
router.post('/topics', postTopic);
router.patch('/topics/:id', patchTopic);
router.delete('/topics/:id', removeTopic);

/**
 * GET  /api/library/topics/:id/words — words in one of my topics
 * POST /api/library/topics/:id/words — add a word to it
 */
router.get('/topics/:id/words', getTopicWords);
router.post('/topics/:id/words', postTopicWord);

/**
 * PATCH  /api/library/words/:id — edit one of my words
 * DELETE /api/library/words/:id — delete it
 */
router.patch('/words/:id', patchWord);
router.delete('/words/:id', removeWord);

export default router;
