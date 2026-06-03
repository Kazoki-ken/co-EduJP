import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  listBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  listTopics,
  getTopicsByBook,
  createTopic,
  updateTopic,
  deleteTopic,
  listWords,
  getWordById,
  createWord,
  updateWord,
  deleteWord,
  toggleSaveWord,
  getSavedWords,
  toggleSaveBook,
  getSavedBooks,
  toggleSaveTopic,
  getSavedTopics,
  getUserProgress,
  getUserBadges,
} from '../services/vocabulary.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const BookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).or(z.literal('')).nullable().optional(),
  imageUrl: z.string().url('Must be a valid URL').or(z.literal('')).nullable().optional(),
});

const TopicSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  bookId: z.string().cuid('Invalid book ID').or(z.literal('')).nullable().optional(),
});

const WordSchema = z.object({
  japaneseWord: z.string().min(1, 'Japanese word is required').max(100),
  hiragana: z.string().min(1, 'Hiragana is required').max(200),
  meaning: z.string().min(1, 'Meaning is required').max(500),
  exampleSentence: z.string().max(500).or(z.literal('')).nullable().optional(),
  exampleTranslation: z.string().max(500).or(z.literal('')).nullable().optional(),
  topicIds: z.array(z.string().cuid()).optional(),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const userId = (req: AuthenticatedRequest) => req.user?.id;

// ─── Books Controllers ────────────────────────────────────────────────────────

export const getBooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page, limit } = PaginationSchema.parse(req.query);
  const result = await listBooks(page, limit, userId(req));
  res.json(result);
};

export const getBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const book = await getBookById(req.params.id, userId(req));
  res.json(book);
};

export const postBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = BookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const book = await createBook(parsed.data);
  res.status(201).json(book);
};

export const putBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = BookSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const book = await updateBook(req.params.id, parsed.data);
  res.json(book);
};

export const removeBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteBook(req.params.id);
  res.status(204).send();
};

// ─── Topics Controllers ───────────────────────────────────────────────────────

export const getTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const bookId = req.query.bookId as string | undefined;
  const topics = await listTopics(bookId, userId(req));
  res.json(topics);
};

export const getBookTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const topics = await getTopicsByBook(req.params.bookId, userId(req));
  res.json(topics);
};

export const postTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = TopicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const topic = await createTopic(parsed.data);
  res.status(201).json(topic);
};

export const putTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = TopicSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const topic = await updateTopic(req.params.id, parsed.data);
  res.json(topic);
};

export const removeTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteTopic(req.params.id);
  res.status(204).send();
};

// ─── Words Controllers ────────────────────────────────────────────────────────

export const getWords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page, limit } = PaginationSchema.parse(req.query);
  const result = await listWords(userId(req), {
    page,
    limit,
    search: req.query.search as string | undefined,
    topicId: req.query.topicId as string | undefined,
    bookId: req.query.bookId as string | undefined,
  });
  res.json(result);
};

export const getWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const word = await getWordById(req.params.id, userId(req));
  res.json(word);
};

export const postWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = WordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const word = await createWord(parsed.data, req.user!.id);
  res.status(201).json(word);
};

export const putWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = WordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }
  const word = await updateWord(req.params.id, parsed.data);
  res.json(word);
};

export const removeWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteWord(req.params.id);
  res.status(204).send();
};

// ─── Saved Words Controllers ──────────────────────────────────────────────────

export const saveWord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await toggleSaveWord(req.user!.id, req.params.id);
  res.json(result);
};

export const getMySavedWords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page, limit } = PaginationSchema.parse(req.query);
  const result = await getSavedWords(req.user!.id, page, limit);
  res.json(result);
};

// ─── Saved Books Controllers ─────────────────────────────────────────────────

export const saveBook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await toggleSaveBook(req.user!.id, req.params.id);
  res.json(result);
};

export const getMySavedBooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page, limit } = PaginationSchema.parse(req.query);
  const result = await getSavedBooks(req.user!.id, page, limit);
  res.json(result);
};

// ─── Saved Topics Controllers ─────────────────────────────────────────────────

export const saveTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await toggleSaveTopic(req.user!.id, req.params.id);
  res.json(result);
};

export const getMySavedTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page, limit } = PaginationSchema.parse(req.query);
  const result = await getSavedTopics(req.user!.id, page, limit);
  res.json(result);
};

// ─── User Progress Controllers ────────────────────────────────────────────────

export const getMyProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const progress = await getUserProgress(req.user!.id);
  res.json(progress);
};

export const getMyBadges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const badges = await getUserBadges(req.user!.id);
  res.json(badges);
};
