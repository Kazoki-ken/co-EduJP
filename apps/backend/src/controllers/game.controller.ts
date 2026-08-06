import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  generateSession,
  submitSession,
  getLeaderboard,
  MAX_SESSION_WORDS,
} from '../services/game.service';
import { GameType, League } from '@prisma/client';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const GameTypeEnum = z.enum(['TEST', 'MATCH', 'WRITE', 'SHOOTER', 'BLOCKS', 'MIXED'] as const);
const LeagueEnum = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as const);

const SessionQuerySchema = z.object({
  type: GameTypeEnum.default('TEST'),
  topicId: z.string().cuid('Invalid topicId').optional(),
  bookId: z.string().cuid('Invalid bookId').optional(),
  limit: z.coerce.number().int().min(1).max(MAX_SESSION_WORDS).default(20),
  dueOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

const AnswerSchema = z.object({
  wordId: z.string().cuid('Invalid wordId'),
  answer: z.string().min(0).max(500),
});

/**
 * A session holds up to MAX_SESSION_WORDS words, and the MATCH game submits one
 * answer per matched pair PLUS one per wrong attempt (5 lives). The old cap of
 * 50 answers rejected any MATCH game longer than 50 words with a 400 — the
 * default MATCH session is 200 words.
 */
const MAX_ANSWERS = 400;

const SubmitSchema = z.object({
  sessionId: z.string().cuid('Invalid sessionId'),
  answers: z
    .array(AnswerSchema)
    .min(1, 'At least one answer is required')
    .max(MAX_ANSWERS, 'Too many answers submitted'),
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

  const timezoneOffset = req.headers['x-timezone-offset']
    ? parseInt(req.headers['x-timezone-offset'] as string, 10)
    : 0;

  // Every game type is open to every signed-in user now. What the free tier
  // limits is HOW MANY sessions per day, not which modes — enforced inside
  // generateSession so it cannot be skipped by calling the service elsewhere.
  const result = await generateSession({
    userId: req.user!.id,
    gameType: type as GameType,
    topicId,
    bookId,
    limit,
    dueOnly: dueOnly ?? false,
    timezoneOffset: Number.isNaN(timezoneOffset) ? 0 : timezoneOffset,
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

  const timezoneOffset = req.headers['x-timezone-offset']
    ? parseInt(req.headers['x-timezone-offset'] as string, 10)
    : 0;

  const result = await submitSession(req.user!.id, parsed.data, timezoneOffset);
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
