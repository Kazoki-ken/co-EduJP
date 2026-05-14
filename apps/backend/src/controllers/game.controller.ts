import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  generateSession,
  submitSession,
  getLeaderboard,
} from '../services/game.service';
import { GameType, League } from '@prisma/client';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const GameTypeEnum = z.enum(['TEST', 'MATCH', 'WRITE', 'SHOOTER'] as const);
const LeagueEnum = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as const);

const SessionQuerySchema = z.object({
  type: GameTypeEnum.default('TEST'),
  topicId: z.string().cuid('Invalid topicId').optional(),
  bookId: z.string().cuid('Invalid bookId').optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  dueOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

const AnswerSchema = z.object({
  wordId: z.string().cuid('Invalid wordId'),
  answer: z.string().min(0).max(500),
});

const SubmitSchema = z.object({
  sessionId: z.string().cuid('Invalid sessionId'),
  answers: z.array(AnswerSchema).min(1, 'At least one answer is required').max(50),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/games/session
 *
 * Generates an anti-cheat game session for the authenticated user.
 * Returns sessionId + words (no answer fields).
 */
export const getGameSession = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = SessionQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { type, topicId, bookId, limit, dueOnly } = parsed.data;

  const result = await generateSession({
    userId: req.user!.id,
    gameType: type as GameType,
    topicId,
    bookId,
    limit,
    dueOnly: dueOnly ?? false,
  });

  res.json(result);
};

/**
 * POST /api/games/submit
 *
 * Accepts answers for a previously generated session.
 * Grades answers, updates SRS, awards XP/coins, evaluates badges.
 * Returns detailed result with per-word SRS updates.
 */
export const postSubmitSession = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const result = await submitSession(req.user!.id, parsed.data);
  res.json(result);
};

/**
 * GET /api/leaderboard
 *
 * Returns current week's leaderboard.
 * Optional query: ?league=BRONZE|SILVER|GOLD|PLATINUM|DIAMOND
 */
export const getLeaderboardHandler = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const leagueParsed = LeagueEnum.optional().safeParse(
    req.query.league as string | undefined,
  );

  if (!leagueParsed.success) {
    res.status(400).json({ error: 'Invalid league value' });
    return;
  }

  const result = await getLeaderboard(leagueParsed.data as League | undefined);
  res.json(result);
};
