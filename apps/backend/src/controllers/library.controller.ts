import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import {
  listMyBooks,
  createMyBook,
  updateMyBook,
  deleteMyBook,
  listMyTopics,
  createMyTopic,
  updateMyTopic,
  deleteMyTopic,
  listMyTopicWords,
  addWordToMyTopic,
  updateMyWord,
  deleteMyWord,
  getMyLibrarySummary,
} from '../services/library.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const BookSchema = z.object({
  title: z.string().trim().min(1, 'Kitob nomi kiritilishi shart').max(120, "Kitob nomi juda uzun"),
  description: z.string().trim().max(500, 'Tavsif juda uzun').optional().nullable(),
  isPublic: z.boolean().optional(),
});

const TopicSchema = z.object({
  name: z.string().trim().min(1, 'Mavzu nomi kiritilishi shart').max(120, 'Mavzu nomi juda uzun'),
  bookId: z.string().cuid('Kitob tanlanmadi').optional().nullable(),
  isPublic: z.boolean().optional(),
});

const WordSchema = z.object({
  japaneseWord: z
    .string()
    .trim()
    .min(1, "Yaponcha so'z kiritilishi shart")
    .max(100, "So'z juda uzun"),
  hiragana: z.string().trim().max(100, "O'qilishi juda uzun").optional().nullable(),
  meaning: z
    .string()
    .trim()
    .min(1, "Ma'nosi kiritilishi shart")
    .max(500, "Ma'nosi juda uzun"),
  exampleSentence: z.string().trim().max(500, 'Misol juda uzun').optional().nullable(),
  exampleTranslation: z.string().trim().max(500, 'Tarjima juda uzun').optional().nullable(),
});

const CuidParam = z.string().cuid('Noto’g’ri identifikator');

/** Parses a body and turns the first validation failure into a 400. */
const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw createError(result.error.errors[0]?.message ?? "Ma'lumot noto'g'ri", 400);
  }
  return result.data;
};

const parseId = (value: string): string => {
  const result = CuidParam.safeParse(value);
  if (!result.success) throw createError('Topilmadi', 404);
  return result.data;
};

// ─── Summary ──────────────────────────────────────────────────────────────────

export const getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json(await getMyLibrarySummary(req.user!.id));
};

// ─── Books ────────────────────────────────────────────────────────────────────

export const getBooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ data: await listMyBooks(req.user!.id) });
};

export const postBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(BookSchema, req.body);
  res.status(201).json(await createMyBook(req.user!.id, dto));
};

export const patchBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(BookSchema.partial(), req.body);
  res.json(await updateMyBook(req.user!.id, parseId(req.params.id), dto));
};

export const removeBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteMyBook(req.user!.id, parseId(req.params.id));
  res.json({ message: "Kitob o'chirildi" });
};

// ─── Topics ───────────────────────────────────────────────────────────────────

export const getTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const bookId = typeof req.query.bookId === 'string' ? req.query.bookId : undefined;
  res.json({ data: await listMyTopics(req.user!.id, bookId) });
};

export const postTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(TopicSchema, req.body);
  res.status(201).json(await createMyTopic(req.user!.id, dto));
};

export const patchTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(TopicSchema.partial(), req.body);
  res.json(await updateMyTopic(req.user!.id, parseId(req.params.id), dto));
};

export const removeTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteMyTopic(req.user!.id, parseId(req.params.id));
  res.json({ message: "Mavzu o'chirildi" });
};

// ─── Words ────────────────────────────────────────────────────────────────────

export const getTopicWords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ data: await listMyTopicWords(req.user!.id, parseId(req.params.id)) });
};

export const postTopicWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(WordSchema, req.body);
  res.status(201).json(await addWordToMyTopic(req.user!.id, parseId(req.params.id), dto));
};

export const patchWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dto = parse(WordSchema.partial(), req.body);
  res.json(await updateMyWord(req.user!.id, parseId(req.params.id), dto));
};

export const removeWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteMyWord(req.user!.id, parseId(req.params.id));
  res.json({ message: "So'z o'chirildi" });
};
