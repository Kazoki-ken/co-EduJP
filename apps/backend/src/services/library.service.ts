import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import {
  assertCanAddWord,
  assertCanCreateTopic,
  assertCanShare,
} from './entitlement.service';

/**
 * "My library" — books, topics and words a learner creates for themselves.
 *
 * Everything here is scoped to the calling user. Ownership is re-checked on
 * every mutation against `authorId` rather than trusted from the request, so a
 * guessed id cannot be used to edit someone else's material. Missing-or-
 * not-yours always reads as 404, never 403, so ids cannot be probed.
 */

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LibraryBookDto {
  title: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface LibraryTopicDto {
  name: string;
  bookId?: string | null;
  isPublic?: boolean;
}

export interface LibraryWordDto {
  japaneseWord: string;
  hiragana?: string | null;
  meaning: string;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
}

// ─── Ownership helpers ────────────────────────────────────────────────────────

const ownedBook = async (userId: string, bookId: string) => {
  const book = await prisma.book.findFirst({ where: { id: bookId, authorId: userId } });
  if (!book) throw createError('Kitob topilmadi', 404);
  return book;
};

const ownedTopic = async (userId: string, topicId: string) => {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, authorId: userId } });
  if (!topic) throw createError('Mavzu topilmadi', 404);
  return topic;
};

// ─── Books ────────────────────────────────────────────────────────────────────

export const listMyBooks = async (userId: string) => {
  return prisma.book.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { topics: true } } },
  });
};

export const createMyBook = async (userId: string, dto: LibraryBookDto) => {
  // Books themselves are unlimited — only publishing one is a paid feature.
  if (dto.isPublic) await assertCanShare(userId);

  return prisma.book.create({
    data: {
      title: dto.title,
      description: dto.description ?? null,
      isPublic: dto.isPublic ?? false,
      authorId: userId,
    },
    include: { _count: { select: { topics: true } } },
  });
};

export const updateMyBook = async (
  userId: string,
  bookId: string,
  dto: Partial<LibraryBookDto>,
) => {
  await ownedBook(userId, bookId);
  if (dto.isPublic) await assertCanShare(userId);

  return prisma.book.update({
    where: { id: bookId },
    data: {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
    },
    include: { _count: { select: { topics: true } } },
  });
};

export const deleteMyBook = async (userId: string, bookId: string) => {
  await ownedBook(userId, bookId);
  // Topics keep their own author and simply lose the book (schema: SetNull),
  // so deleting a book never silently destroys the words inside its topics.
  await prisma.book.delete({ where: { id: bookId } });
};

// ─── Topics ───────────────────────────────────────────────────────────────────

export const listMyTopics = async (userId: string, bookId?: string) => {
  return prisma.topic.findMany({
    where: { authorId: userId, ...(bookId ? { bookId } : {}) },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { wordTopics: true } },
      book: { select: { id: true, title: true } },
    },
  });
};

export const createMyTopic = async (userId: string, dto: LibraryTopicDto) => {
  // Only allow attaching a topic to a book the same user owns.
  if (dto.bookId) await ownedBook(userId, dto.bookId);
  await assertCanCreateTopic(userId);
  if (dto.isPublic) await assertCanShare(userId);

  return prisma.topic.create({
    data: {
      name: dto.name,
      bookId: dto.bookId ?? null,
      isPublic: dto.isPublic ?? false,
      authorId: userId,
    },
    include: {
      _count: { select: { wordTopics: true } },
      book: { select: { id: true, title: true } },
    },
  });
};

export const updateMyTopic = async (
  userId: string,
  topicId: string,
  dto: Partial<LibraryTopicDto>,
) => {
  await ownedTopic(userId, topicId);
  if (dto.bookId) await ownedBook(userId, dto.bookId);
  if (dto.isPublic) await assertCanShare(userId);

  return prisma.topic.update({
    where: { id: topicId },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.bookId !== undefined && { bookId: dto.bookId }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
    },
    include: {
      _count: { select: { wordTopics: true } },
      book: { select: { id: true, title: true } },
    },
  });
};

export const deleteMyTopic = async (userId: string, topicId: string) => {
  await ownedTopic(userId, topicId);

  // Delete the topic's own words along with it. Only words this user created
  // are removed, and only those not also used by another topic — so a word
  // shared across two of the user's topics survives, and official words
  // linked into a user topic are never touched.
  const links = await prisma.wordTopic.findMany({
    where: { topicId },
    select: { wordId: true },
  });
  const wordIds = links.map((l) => l.wordId);

  await prisma.$transaction(async (tx) => {
    await tx.topic.delete({ where: { id: topicId } });

    if (wordIds.length > 0) {
      const stillLinked = await tx.wordTopic.findMany({
        where: { wordId: { in: wordIds } },
        select: { wordId: true },
      });
      const keep = new Set(stillLinked.map((l) => l.wordId));
      const orphaned = wordIds.filter((id) => !keep.has(id));

      if (orphaned.length > 0) {
        await tx.word.deleteMany({
          where: { id: { in: orphaned }, isUserCreated: true, authorId: userId },
        });
      }
    }
  });
};

// ─── Words ────────────────────────────────────────────────────────────────────

export const listMyTopicWords = async (userId: string, topicId: string) => {
  await ownedTopic(userId, topicId);

  const links = await prisma.wordTopic.findMany({
    where: { topicId },
    include: { word: true },
    orderBy: [{ sortOrder: 'asc' }, { word: { createdAt: 'asc' } }],
  });

  return links.map((l) => l.word);
};

export const addWordToMyTopic = async (
  userId: string,
  topicId: string,
  dto: LibraryWordDto,
) => {
  await ownedTopic(userId, topicId);
  await assertCanAddWord(userId, topicId);

  // A hand-added word goes to the end of the topic, not the top.
  const last = await prisma.wordTopic.aggregate({
    where: { topicId },
    _max: { sortOrder: true },
  });

  return prisma.word.create({
    data: {
      japaneseWord: dto.japaneseWord,
      hiragana: dto.hiragana ?? null,
      meaning: dto.meaning,
      exampleSentence: dto.exampleSentence ?? null,
      exampleTranslation: dto.exampleTranslation ?? null,
      authorId: userId,
      isUserCreated: true,
      wordTopics: { create: { topicId, sortOrder: (last._max.sortOrder ?? 0) + 1 } },
    },
  });
};

const ownedWord = async (userId: string, wordId: string) => {
  const word = await prisma.word.findFirst({
    where: { id: wordId, authorId: userId, isUserCreated: true },
  });
  if (!word) throw createError("So'z topilmadi", 404);
  return word;
};

export const updateMyWord = async (
  userId: string,
  wordId: string,
  dto: Partial<LibraryWordDto>,
) => {
  await ownedWord(userId, wordId);

  return prisma.word.update({
    where: { id: wordId },
    data: {
      ...(dto.japaneseWord !== undefined && { japaneseWord: dto.japaneseWord }),
      ...(dto.hiragana !== undefined && { hiragana: dto.hiragana }),
      ...(dto.meaning !== undefined && { meaning: dto.meaning }),
      ...(dto.exampleSentence !== undefined && { exampleSentence: dto.exampleSentence }),
      ...(dto.exampleTranslation !== undefined && {
        exampleTranslation: dto.exampleTranslation,
      }),
    },
  });
};

export const deleteMyWord = async (userId: string, wordId: string) => {
  await ownedWord(userId, wordId);
  await prisma.word.delete({ where: { id: wordId } });
};

// ─── Summary (for the library landing screen) ────────────────────────────────

export const getMyLibrarySummary = async (userId: string) => {
  const [bookCount, topicCount, wordCount, publicTopics] = await Promise.all([
    prisma.book.count({ where: { authorId: userId } }),
    prisma.topic.count({ where: { authorId: userId } }),
    prisma.word.count({ where: { authorId: userId, isUserCreated: true } }),
    prisma.topic.count({ where: { authorId: userId, isPublic: true } }),
  ]);

  return { bookCount, topicCount, wordCount, publicTopics };
};
