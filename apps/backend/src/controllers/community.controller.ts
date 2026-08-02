import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import {
  listPublicAuthors,
  getPublicProfile,
  getPublicTopicWords,
} from '../services/community.service';

const DirectoryQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

/**
 * GET /api/community/users
 * Learners who have shared at least one public book or topic.
 */
export const getAuthors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = DirectoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { search, page, limit } = parsed.data;
  res.json(await listPublicAuthors(search || undefined, page, limit));
};

/**
 * GET /api/community/users/:username
 * Public profile plus the books and topics that learner has shared.
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const username = req.params.username;
  if (!username) throw createError('Foydalanuvchi topilmadi', 404);

  res.json(await getPublicProfile(username, req.user?.id));
};

/**
 * GET /api/community/topics/:id/words
 * Preview the words inside a public topic before saving it.
 */
export const getTopicWords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = z.string().cuid().safeParse(req.params.id);
  if (!parsed.success) throw createError('Mavzu topilmadi', 404);

  res.json(await getPublicTopicWords(parsed.data));
};
