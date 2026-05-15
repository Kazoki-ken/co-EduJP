import { Router } from 'express';
import {
  getBooks,
  getBook,
  postBook,
  putBook,
  removeBook,
  getTopics,
  getBookTopics,
  postTopic,
  putTopic,
  removeTopic,
  getWords,
  getWord,
  postWord,
  putWord,
  removeWord,
  saveWord,
  getMySavedWords,
  saveBook,
  getMySavedBooks,
  saveTopic,
  getMySavedTopics,
  getMyProgress,
  getMyBadges,
} from '../controllers/vocabulary.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// ─── Books ────────────────────────────────────────────────────────────────────

/**
 * GET  /api/books          — Paginated list of all books
 * POST /api/books          — [ADMIN] Create a new book
 */
router.get('/books', getBooks);
router.post('/books', authenticate, requireAdmin, postBook);

/**
 * GET    /api/books/:id          — Single book detail
 * PUT    /api/books/:id          — [ADMIN] Update book
 * DELETE /api/books/:id          — [ADMIN] Delete book
 */
router.get('/books/:id', getBook);
router.put('/books/:id', authenticate, requireAdmin, putBook);
router.delete('/books/:id', authenticate, requireAdmin, removeBook);

/**
 * POST /api/books/:id/save — Toggle save/unsave a book (authenticated)
 */
router.post('/books/:id/save', authenticate, saveBook);

/**
 * GET /api/books/:bookId/topics  — Topics belonging to a specific book
 */
router.get('/books/:bookId/topics', getBookTopics);

// ─── Topics ───────────────────────────────────────────────────────────────────

/**
 * GET  /api/topics         — All topics (optionally filter by ?bookId=)
 * POST /api/topics         — [ADMIN] Create a topic
 */
router.get('/topics', getTopics);
router.post('/topics', authenticate, requireAdmin, postTopic);

/**
 * PUT    /api/topics/:id   — [ADMIN] Update topic
 * DELETE /api/topics/:id   — [ADMIN] Delete topic
 */
router.put('/topics/:id', authenticate, requireAdmin, putTopic);
router.delete('/topics/:id', authenticate, requireAdmin, removeTopic);

/**
 * POST /api/topics/:id/save — Toggle save/unsave a topic (authenticated)
 */
router.post('/topics/:id/save', authenticate, saveTopic);

// ─── Words ────────────────────────────────────────────────────────────────────

/**
 * GET  /api/words          — Paginated + searchable word list
 *                            Query: ?search=&topicId=&bookId=&page=&limit=
 * POST /api/words          — [ADMIN] Create a word
 */
router.get('/words', getWords);
router.post('/words', authenticate, requireAdmin, postWord);

/**
 * GET    /api/words/:id    — Word detail
 * PUT    /api/words/:id    — [ADMIN] Update word
 * DELETE /api/words/:id    — [ADMIN] Delete word
 */
router.get('/words/:id', getWord);
router.put('/words/:id', authenticate, requireAdmin, putWord);
router.delete('/words/:id', authenticate, requireAdmin, removeWord);

/**
 * POST /api/words/:id/save — Toggle save/unsave a word (authenticated)
 */
router.post('/words/:id/save', authenticate, saveWord);

// ─── User Routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/users/me/saved-words   — Current user's saved words
 * GET /api/users/me/saved-books   — Current user's saved books
 * GET /api/users/me/saved-topics  — Current user's saved topics
 * GET /api/users/me/progress      — SRS progress + due-today words
 * GET /api/users/me/badges        — Earned badges
 */
router.get('/users/me/saved-words', authenticate, getMySavedWords);
router.get('/users/me/saved-books', authenticate, getMySavedBooks);
router.get('/users/me/saved-topics', authenticate, getMySavedTopics);
router.get('/users/me/progress', authenticate, getMyProgress);
router.get('/users/me/badges', authenticate, getMyBadges);

export default router;
