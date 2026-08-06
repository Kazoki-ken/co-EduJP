import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  uploadGlobalWords,
  uploadBookWords,
  getUsers,
  putUserRole,
  removeUser,
  getConfig,
  putConfig,
  removeConfig,
  getStats,
} from '../controllers/admin.controller';
import {
  postGrantPremium,
  deletePremium,
  getUserGrants,
  getPendingPayments,
  postApprovePayment,
  postRejectPayment,
} from '../controllers/premium.controller';

const router = Router();

// ─── All admin routes require authentication + admin role ─────────────────────
router.use(authenticate, requireAdmin);

// ─── Multer Setup ─────────────────────────────────────────────────────────────

/**
 * In-memory storage (no disk writes): files are available as req.file.buffer.
 * Max file size: 10 MB. Accepted MIME types: CSV and Excel variants.
 */
const ACCEPTED_MIMES = [
  'text/csv',
  'text/plain',                                              // some CSV exports
  'application/vnd.ms-excel',                               // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/octet-stream',                               // generic fallback
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: Request, file, cb) => {
    if (ACCEPTED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use CSV or Excel.`));
    }
  },
});

/** Multer error → clean JSON 400 response. */
const handleMulterError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err instanceof Error && err.message.startsWith('Unsupported file type')) {
    res.status(415).json({ error: err.message });
    return;
  }
  next(err);
};

// ─── Upload Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/admin/upload/words
 * Bulk upload CSV/Excel → global words
 * Optional query: ?topicIds=cuid1,cuid2
 */
router.post(
  '/upload/words',
  upload.single('file'),
  handleMulterError,
  uploadGlobalWords,
);

/**
 * POST /api/admin/upload/book-words
 * Bulk upload CSV/Excel → words tied to a book + auto topic
 * Body fields (alongside file): bookId, topicName
 */
router.post(
  '/upload/book-words',
  upload.single('file'),
  handleMulterError,
  uploadBookWords,
);

// ─── User Management Routes ───────────────────────────────────────────────────

/**
 * GET  /api/admin/users          — Paginated user list (search, role filter)
 * PUT  /api/admin/users/:id/role — Promote / demote a user
 * DELETE /api/admin/users/:id    — Hard-delete a user (cannot delete self)
 */
router.get('/users', getUsers);
router.put('/users/:id/role', putUserRole);
router.delete('/users/:id', removeUser);

// ─── Premium Management ───────────────────────────────────────────────────────

/**
 * POST   /api/admin/users/:id/premium — grant premium
 *        Body: { months?: number, amount?: number, note?: string }
 *        months omitted or 0 → lifetime grant.
 * DELETE /api/admin/users/:id/premium — revoke, back to FREE
 * GET    /api/admin/users/:id/premium — that user's grant history
 *
 * Manual granting is stage one of billing: payment is collected out of band
 * and recorded here. The Payme/Click webhooks will call the same service.
 */
router.post('/users/:id/premium', postGrantPremium);
router.delete('/users/:id/premium', deletePremium);
router.get('/users/:id/premium', getUserGrants);

// ─── Payment Review ───────────────────────────────────────────────────────────

/**
 * GET  /api/admin/payments             — receipts waiting for a decision
 * POST /api/admin/payments/:id/approve — grant the premium that was paid for
 * POST /api/admin/payments/:id/reject  — decline, with an optional reason
 *
 * The same decisions can be made from the bot's inline buttons; both paths run
 * through payment.service, so approving twice is a no-op rather than a double
 * grant.
 */
router.get('/payments', getPendingPayments);
router.post('/payments/:id/approve', postApprovePayment);
router.post('/payments/:id/reject', postRejectPayment);

// ─── Site Configuration Routes ────────────────────────────────────────────────

/**
 * GET    /api/admin/config        — All config key→value pairs
 * PUT    /api/admin/config        — Upsert one or more keys
 * DELETE /api/admin/config/:key   — Remove a single key
 */
router.get('/config', getConfig);
router.put('/config', putConfig);
router.delete('/config/:key', removeConfig);

// ─── Platform Stats Route ─────────────────────────────────────────────────────

/**
 * GET /api/admin/stats — Platform-wide statistics for admin dashboard
 */
router.get('/stats', getStats);

export default router;
