import { Response } from 'express';
import { z } from 'zod';
import { JlptLevel, JlptSection, JlptQuestionType } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import * as admin from '../services/jlptAdmin.service';
import { parseSpreadsheet } from '../services/admin.service';

type SheetRow = Record<string, unknown>;

const levelSchema = z.nativeEnum(JlptLevel);
const sectionSchema = z.nativeEnum(JlptSection);

/** GET /api/admin/jlpt/tests?level=N5&section=MOJI_GOI */
export const getTests = async (req: AuthenticatedRequest, res: Response) => {
  const level = levelSchema.parse(req.query.level);
  const section = sectionSchema.parse(req.query.section);
  res.json(await admin.listTests(level, section));
};

const createTestSchema = z.object({
  level: levelSchema,
  section: sectionSchema,
  title: z.string().max(120).optional(),
  minutes: z.number().int().min(1).max(240).optional(),
});

/** POST /api/admin/jlpt/tests */
export const postTest = async (req: AuthenticatedRequest, res: Response) => {
  const body = createTestSchema.parse(req.body);
  res.status(201).json(await admin.createTest(body));
};

const patchTestSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  minutes: z.number().int().min(1).max(240).optional(),
  isPublished: z.boolean().optional(),
});

/** PATCH /api/admin/jlpt/tests/:id */
export const patchTest = async (req: AuthenticatedRequest, res: Response) => {
  const body = patchTestSchema.parse(req.body);
  res.json(await admin.updateTest(req.params.id, body));
};

/** DELETE /api/admin/jlpt/tests/:id */
export const removeTest = async (req: AuthenticatedRequest, res: Response) => {
  await admin.deleteTest(req.params.id);
  res.status(204).end();
};

/** GET /api/admin/jlpt/tests/:id — the paper with its answer key. */
export const getTest = async (req: AuthenticatedRequest, res: Response) => {
  res.json(await admin.getTestForEdit(req.params.id));
};

const groupSchema = z.object({
  type: z.nativeEnum(JlptQuestionType),
  instruction: z.string().min(1).max(500),
  instructionUz: z.string().max(500).optional(),
  passage: z.string().max(8000).optional(),
  imageUrl: z.string().max(500).optional(),
  audioUrl: z.string().max(500).optional(),
});

/** POST /api/admin/jlpt/tests/:id/groups */
export const postGroup = async (req: AuthenticatedRequest, res: Response) => {
  const body = groupSchema.parse(req.body);
  res.status(201).json(await admin.createGroup(req.params.id, body));
};

/** PATCH /api/admin/jlpt/groups/:id */
export const patchGroup = async (req: AuthenticatedRequest, res: Response) => {
  const body = groupSchema.partial().parse(req.body);
  res.json(await admin.updateGroup(req.params.id, body));
};

/** DELETE /api/admin/jlpt/groups/:id */
export const removeGroup = async (req: AuthenticatedRequest, res: Response) => {
  await admin.deleteGroup(req.params.id);
  res.status(204).end();
};

const questionSchema = z.object({
  stem: z.string().min(1).max(2000),
  focus: z.string().max(200).optional(),
  transcript: z.string().max(4000).optional(),
  imageUrl: z.string().max(500).optional(),
  audioUrl: z.string().max(500).optional(),
  explanationUz: z.string().max(1000).optional(),
  choices: z.array(z.string().max(500)).min(2).max(4),
  answer: z.number().int().min(1).max(4),
});

/** POST /api/admin/jlpt/groups/:id/questions */
export const postQuestion = async (req: AuthenticatedRequest, res: Response) => {
  const body = questionSchema.parse(req.body);
  res.status(201).json(await admin.createQuestion(req.params.id, body));
};

/** PATCH /api/admin/jlpt/questions/:id */
export const patchQuestion = async (req: AuthenticatedRequest, res: Response) => {
  const body = questionSchema.parse(req.body);
  res.json(await admin.updateQuestion(req.params.id, body));
};

/** DELETE /api/admin/jlpt/questions/:id */
export const removeQuestion = async (req: AuthenticatedRequest, res: Response) => {
  await admin.deleteQuestion(req.params.id);
  res.status(204).end();
};

// ─── Spreadsheet import ───────────────────────────────────────────────────────

/** Column headers accepted in the template, in Uzbek and in English. */
const COLUMNS: Record<string, string[]> = {
  mondai: ['mondai', 'monday', 'もんだい', 'bolim', "bo'lim", 'guruh'],
  type: ['type', 'tur', 'savol_turi', 'savol turi'],
  instruction: ['instruction', 'yoriqnoma', "yo'riqnoma", 'koрsatma'],
  instructionUz: ['instruction_uz', 'yoriqnoma_uz', 'izoh_yoriqnoma'],
  passage: ['passage', 'matn', 'umumiy_matn', 'umumiy matn'],
  stem: ['stem', 'savol', 'gap'],
  focus: ['focus', 'chizilgan', 'chizilgan_soz', 'tagi_chizilgan'],
  choice1: ['choice1', 'variant1', 'a', '1'],
  choice2: ['choice2', 'variant2', 'b', '2'],
  choice3: ['choice3', 'variant3', 'c', '3'],
  choice4: ['choice4', 'variant4', 'd', '4'],
  answer: ['answer', 'javob', "to'g'ri", 'togri', 'togri_javob'],
  explanationUz: ['explanation', 'izoh', 'izoh_uz'],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '');

/** Finds a row's value by any of a column's accepted names. */
const pick = (row: SheetRow, key: keyof typeof COLUMNS): string => {
  const names = COLUMNS[key].map(norm);
  for (const [k, v] of Object.entries(row)) {
    if (names.includes(norm(k))) return String(v ?? '').trim();
  }
  return '';
};

/**
 * POST /api/admin/jlpt/tests/:id/import
 *
 * One row per question. Rows are grouped by their もんだい number; the first
 * row of a group carries the instruction and any shared passage.
 */
export const postImport = async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw createError('Fayl yuborilmadi', 400);

  const sheet = parseSpreadsheet(file.buffer);
  const problems: string[] = [];

  const rows: admin.ImportRow[] = [];
  sheet.forEach((raw, i) => {
    const line = i + 2; // header is line 1
    const stem = pick(raw, 'stem');
    if (!stem) return; // blank spacer rows are ignored rather than failing

    const choices = [
      pick(raw, 'choice1'),
      pick(raw, 'choice2'),
      pick(raw, 'choice3'),
      pick(raw, 'choice4'),
    ].filter(Boolean);

    const answer = Number(pick(raw, 'answer'));
    const typeRaw = pick(raw, 'type').toUpperCase().replace(/[\s-]+/g, '_');
    const mondai = Number(pick(raw, 'mondai')) || 1;

    if (choices.length < 2) problems.push(`${line}-qator: kamida 2 ta variant kerak`);
    if (!Number.isInteger(answer) || answer < 1 || answer > choices.length) {
      problems.push(`${line}-qator: javob raqami notoʻgʻri`);
    }
    if (!(typeRaw in JlptQuestionType)) {
      problems.push(`${line}-qator: savol turi notaʻnish — "${typeRaw}"`);
    }
    if (problems.length) return;

    rows.push({
      mondai,
      type: typeRaw as JlptQuestionType,
      instruction: pick(raw, 'instruction') || undefined,
      instructionUz: pick(raw, 'instructionUz') || undefined,
      passage: pick(raw, 'passage') || undefined,
      stem,
      focus: pick(raw, 'focus') || undefined,
      choices,
      answer,
      explanationUz: pick(raw, 'explanationUz') || undefined,
    });
  });

  if (problems.length) {
    // Nothing is written when the file has errors — a half-imported paper is
    // harder to fix than one that was rejected outright.
    throw createError(`Faylda xatolar bor:\n${problems.slice(0, 10).join('\n')}`, 400);
  }

  res.json(await admin.importRows(req.params.id, rows));
};
