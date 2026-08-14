import { Response } from 'express';
import { z } from 'zod';
import { JlptLevel } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import {
  finishAttempt,
  getAttempt,
  getPaper,
  getReview,
  getSetInfo,
  getSetPaper,
  getTestInfo,
  listSets,
  listTests,
  saveAnswers,
  startAttempt,
  timingFor,
} from '../services/jlpt.service';

const levelSchema = z.nativeEnum(JlptLevel);

const parseLevel = (value: unknown) => {
  const parsed = levelSchema.safeParse(value);
  if (!parsed.success) throw createError('Daraja notoʻgʻri (N5–N1)', 400);
  return parsed.data;
};

/** GET /api/jlpt/levels/:level — sections, their tests, and the full-exam sets. */
export const getLevel = async (req: AuthenticatedRequest, res: Response) => {
  const level = parseLevel(req.params.level);
  const isAdmin = req.user?.role === 'ADMIN';

  const [tests, sets] = await Promise.all([
    listTests(level, isAdmin, req.user?.id),
    listSets(level, isAdmin),
  ]);

  res.json({ level, tests, sets });
};

/**
 * GET /api/jlpt/tests/:id/info
 * The cover page: how long, how many questions, your best score. No paper.
 */
export const getTestBriefing = async (req: AuthenticatedRequest, res: Response) => {
  const info = await getTestInfo(req.params.id, req.user?.id);
  if (!info.isPublished && req.user?.role !== 'ADMIN') {
    throw createError('Test hali nashr etilmagan', 404);
  }
  res.json(info);
};

/** GET /api/jlpt/sets/:id/info — the full exam's cover page. Open. */
export const getSetBriefing = async (req: AuthenticatedRequest, res: Response) => {
  const info = await getSetInfo(req.params.id, req.user?.id);
  if (!info.isPublished && req.user?.role !== 'ADMIN') {
    throw createError('Imtihon hali nashr etilmagan', 404);
  }
  res.json(info);
};

/** GET /api/jlpt/sets/:id — every section's paper at once. Premium-gated. */
export const getSetTests = async (req: AuthenticatedRequest, res: Response) => {
  const paper = await getSetPaper(req.params.id);
  if (!paper.isPublished && req.user?.role !== 'ADMIN') {
    throw createError('Imtihon hali nashr etilmagan', 404);
  }
  res.json(paper);
};

/** GET /api/jlpt/tests/:id — the paper itself. Premium-gated. */
export const getTest = async (req: AuthenticatedRequest, res: Response) => {
  const test = await getPaper(req.params.id);
  if (!test.isPublished && req.user?.role !== 'ADMIN') {
    throw createError('Test hali nashr etilmagan', 404);
  }
  res.json(test);
};

const startSchema = z.object({
  testId: z.string().cuid().optional(),
  setId: z.string().cuid().optional(),
});

/**
 * POST /api/jlpt/attempts
 * Body: { testId } for a section drill, or { setId } for the full exam.
 *
 * Re-posting while an attempt is already running resumes it instead of
 * starting a fresh clock — that is what makes leaving the page pointless.
 */
export const postAttempt = async (req: AuthenticatedRequest, res: Response) => {
  const body = startSchema.parse(req.body);
  const { attempt, minutes, resumed } = await startAttempt(req.user!.id, body);

  res.status(resumed ? 200 : 201).json({
    attempt,
    resumed,
    timing: minutes
      ? timingFor({ startedAt: attempt.startedAt, minutes })
      : null,
  });
};

/** GET /api/jlpt/attempts/:id — state and remaining time, for resuming. */
export const getAttemptState = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { attempt, timing } = await getAttempt(req.user!.id, req.params.id);
  res.json({ attempt, timing });
};

const answersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        chosen: z.number().int().min(1).max(4).nullable(),
      }),
    )
    .max(200),
});

/**
 * PATCH /api/jlpt/attempts/:id/answers
 * The client batches a few seconds' worth of taps into one call.
 */
export const patchAnswers = async (req: AuthenticatedRequest, res: Response) => {
  const { answers } = answersSchema.parse(req.body);
  const result = await saveAnswers(req.user!.id, req.params.id, answers);
  res.json(result);
};

/**
 * GET /api/jlpt/attempts/:id/review
 * The marked paper: correct answers, what the learner picked, and why.
 * Refused while the attempt is still open.
 */
export const getReviewPaper = async (req: AuthenticatedRequest, res: Response) => {
  res.json(await getReview(req.user!.id, req.params.id));
};

/** POST /api/jlpt/attempts/:id/finish — close and score. */
export const postFinish = async (req: AuthenticatedRequest, res: Response) => {
  const attempt = await finishAttempt(req.user!.id, req.params.id);
  res.json(attempt);
};
