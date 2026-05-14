import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  bulkUploadWords,
  bulkUploadBookWords,
  listUsers,
  setUserRole,
  deleteUser,
  getAllConfig,
  upsertConfig,
  deleteConfig,
  getPlatformStats,
} from '../services/admin.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const RoleSchema = z.enum(['USER', 'ADMIN'] as const);

const SetRoleSchema = z.object({
  role: RoleSchema,
});

const ConfigUpsertSchema = z
  .record(z.string().min(1), z.string())
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Must provide at least one key-value pair',
  });

const GlobalUploadQuerySchema = z.object({
  topicIds: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
});

const BookUploadBodySchema = z.object({
  bookId: z.string().cuid('Invalid bookId'),
  topicName: z.string().min(1, 'topicName is required').max(200),
});

const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: RoleSchema.optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Extracts the uploaded file buffer from multer. Throws 400 if missing. */
const requireFile = (req: AuthenticatedRequest, res: Response): Buffer | null => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Send the file as multipart/form-data with field name "file".' });
    return null;
  }
  return req.file.buffer;
};

// ─── Upload Controllers ───────────────────────────────────────────────────────

/**
 * POST /api/admin/upload/words
 *
 * Bulk-import words globally from a CSV or Excel file.
 * Optionally attach them to existing topics via ?topicIds=id1,id2
 *
 * File field name: "file"
 * Accepted types: .csv, .xlsx, .xls
 *
 * Expected columns (case-insensitive):
 *   japanese_word | hiragana | meaning | example_sentence | example_translation
 */
export const uploadGlobalWords = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const buffer = requireFile(req, res);
  if (!buffer) return;

  const parsed = GlobalUploadQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const result = await bulkUploadWords(buffer, req.user!.id, parsed.data.topicIds);
  res.status(207).json({
    message: `Bulk upload complete: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors.`,
    ...result,
  });
};

/**
 * POST /api/admin/upload/book-words
 *
 * Bulk-import words and attach them to a specific book + topic.
 * The topic is created automatically if it doesn't exist.
 *
 * Body (form fields alongside file):
 *   bookId    — CUID of the target book
 *   topicName — Name of the topic to find-or-create
 *
 * File field name: "file"
 */
export const uploadBookWords = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const buffer = requireFile(req, res);
  if (!buffer) return;

  const parsed = BookUploadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { bookId, topicName } = parsed.data;
  const result = await bulkUploadBookWords(buffer, req.user!.id, bookId, topicName);
  res.status(207).json({
    message: `Bulk book upload complete: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors.`,
    ...result,
  });
};

// ─── User Management Controllers ──────────────────────────────────────────────

/**
 * GET /api/admin/users
 *
 * Paginated list of all users with profile snapshot.
 * Query: ?page=&limit=&search=&role=USER|ADMIN
 */
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = ListUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const result = await listUsers(parsed.data);
  res.json(result);
};

/**
 * PUT /api/admin/users/:id/role
 *
 * Promote or demote a user.
 * Body: { role: "USER" | "ADMIN" }
 */
export const putUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = SetRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const updated = await setUserRole(req.params.id, parsed.data.role);
  res.json(updated);
};

/**
 * DELETE /api/admin/users/:id
 *
 * Hard-deletes a user and all cascade-deleted data.
 * An admin cannot delete themselves.
 */
export const removeUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  await deleteUser(req.params.id, req.user!.id);
  res.status(204).send();
};

// ─── Site Config Controllers ──────────────────────────────────────────────────

/**
 * GET /api/admin/config
 *
 * Returns all site configuration as a flat key→value map.
 * Sensitive values (e.g. API keys) are visible only to admins.
 */
export const getConfig = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const config = await getAllConfig();
  res.json(config);
};

/**
 * PUT /api/admin/config
 *
 * Upserts one or more config keys.
 * Body: { "gemini_api_key": "...", "site_name": "..." }
 */
export const putConfig = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = ConfigUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const updated = await upsertConfig(parsed.data);
  res.json(updated);
};

/**
 * DELETE /api/admin/config/:key
 *
 * Removes a single config key.
 */
export const removeConfig = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  await deleteConfig(req.params.key);
  res.status(204).send();
};

// ─── Platform Stats Controller ────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide statistics for the admin dashboard.
 */
export const getStats = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const stats = await getPlatformStats();
  res.json(stats);
};
