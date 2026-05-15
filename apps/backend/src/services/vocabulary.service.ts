import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookDto {
  title: string;
  description?: string;
  imageUrl?: string;
}

export interface CreateTopicDto {
  name: string;
  bookId?: string;
}

export interface CreateWordDto {
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  topicIds?: string[];
}

export interface WordListQuery {
  page?: number;
  limit?: number;
  search?: string;
  topicId?: string;
  bookId?: string;
}

// ─── Books ────────────────────────────────────────────────────────────────────

export const listBooks = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { topics: true, savedBooks: true } },
      },
    }),
    prisma.book.count(),
  ]);

  return {
    data: books,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBookById = async (id: string) => {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      _count: { select: { topics: true, savedBooks: true } },
    },
  });
  if (!book) throw createError('Book not found', 404);
  return book;
};

export const createBook = async (dto: CreateBookDto) => {
  return prisma.book.create({
    data: {
      title: dto.title,
      description: dto.description,
      imageUrl: dto.imageUrl,
    },
  });
};

export const updateBook = async (id: string, dto: Partial<CreateBookDto>) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw createError('Book not found', 404);

  return prisma.book.update({
    where: { id },
    data: dto,
  });
};

export const deleteBook = async (id: string) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw createError('Book not found', 404);
  await prisma.book.delete({ where: { id } });
};

// ─── Topics ───────────────────────────────────────────────────────────────────

export const listTopics = async (bookId?: string) => {
  return prisma.topic.findMany({
    where: bookId ? { bookId } : {},
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { wordTopics: true } },
      book: { select: { id: true, title: true } },
    },
  });
};

export const getTopicsByBook = async (bookId: string) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw createError('Book not found', 404);

  return prisma.topic.findMany({
    where: { bookId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { wordTopics: true } },
    },
  });
};

export const createTopic = async (dto: CreateTopicDto) => {
  if (dto.bookId) {
    const book = await prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) throw createError('Book not found', 404);
  }

  return prisma.topic.create({
    data: {
      name: dto.name,
      bookId: dto.bookId ?? null,
    },
  });
};

export const updateTopic = async (id: string, dto: Partial<CreateTopicDto>) => {
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) throw createError('Topic not found', 404);

  return prisma.topic.update({ where: { id }, data: dto });
};

export const deleteTopic = async (id: string) => {
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) throw createError('Topic not found', 404);
  await prisma.topic.delete({ where: { id } });
};

// ─── Words ────────────────────────────────────────────────────────────────────

export const listWords = async (userId: string | undefined, query: WordListQuery) => {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { japaneseWord: { contains: query.search, mode: 'insensitive' } },
      { hiragana: { contains: query.search, mode: 'insensitive' } },
      { meaning: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.topicId) {
    where.wordTopics = { some: { topicId: query.topicId } };
  }

  if (query.bookId) {
    where.wordTopics = { some: { topic: { bookId: query.bookId } } };
  }

  const [words, total] = await Promise.all([
    prisma.word.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        wordTopics: {
          include: {
            topic: { include: { book: { select: { id: true, title: true } } } },
          },
        },
        ...(userId && {
          savedWords: { where: { userId }, select: { userId: true } },
        }),
      },
    }),
    prisma.word.count({ where }),
  ]);

  const data = words.map((w) => {
    const { savedWords, ...rest } = w as typeof w & { savedWords?: { userId: string }[] };
    return {
      ...rest,
      isSaved: userId ? (savedWords?.length ?? 0) > 0 : false,
    };
  });

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getWordById = async (id: string, userId?: string) => {
  const word = await prisma.word.findUnique({
    where: { id },
    include: {
      wordTopics: {
        include: {
          topic: { include: { book: { select: { id: true, title: true } } } },
        },
      },
      author: { select: { id: true, username: true } },
      ...(userId && {
        savedWords: { where: { userId }, select: { userId: true } },
      }),
    },
  });

  if (!word) throw createError('Word not found', 404);

  const { savedWords, ...rest } = word as typeof word & { savedWords?: { userId: string }[] };
  return {
    ...rest,
    isSaved: userId ? (savedWords?.length ?? 0) > 0 : false,
  };
};

export const createWord = async (dto: CreateWordDto, authorId: string) => {
  return prisma.word.create({
    data: {
      japaneseWord: dto.japaneseWord,
      hiragana: dto.hiragana,
      meaning: dto.meaning,
      exampleSentence: dto.exampleSentence,
      exampleTranslation: dto.exampleTranslation,
      authorId,
      ...(dto.topicIds?.length && {
        wordTopics: {
          create: dto.topicIds.map((topicId) => ({ topicId })),
        },
      }),
    },
    include: {
      wordTopics: { include: { topic: true } },
    },
  });
};

export const updateWord = async (id: string, dto: Partial<CreateWordDto>) => {
  const word = await prisma.word.findUnique({ where: { id } });
  if (!word) throw createError('Word not found', 404);

  const { topicIds, ...wordData } = dto;

  return prisma.$transaction(async (tx) => {
    if (topicIds !== undefined) {
      await tx.wordTopic.deleteMany({ where: { wordId: id } });
      if (topicIds.length > 0) {
        await tx.wordTopic.createMany({
          data: topicIds.map((topicId) => ({ wordId: id, topicId })),
        });
      }
    }

    return tx.word.update({
      where: { id },
      data: wordData,
      include: { wordTopics: { include: { topic: true } } },
    });
  });
};

export const deleteWord = async (id: string) => {
  const word = await prisma.word.findUnique({ where: { id } });
  if (!word) throw createError('Word not found', 404);
  await prisma.word.delete({ where: { id } });
};

// ─── Save / Unsave Word ───────────────────────────────────────────────────────

export const toggleSaveWord = async (userId: string, wordId: string) => {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw createError('Word not found', 404);

  const existing = await prisma.savedWord.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  if (existing) {
    await prisma.savedWord.delete({
      where: { userId_wordId: { userId, wordId } },
    });
    return { saved: false };
  } else {
    await prisma.savedWord.create({ data: { userId, wordId } });
    return { saved: true };
  }
};

export const getSavedWords = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [savedWords, total] = await Promise.all([
    prisma.savedWord.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { savedAt: 'desc' },
      include: {
        word: {
          include: {
            wordTopics: {
              include: {
                topic: { include: { book: { select: { id: true, title: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.savedWord.count({ where: { userId } }),
  ]);

  return {
    data: savedWords.map((sw) => ({ ...sw.word, isSaved: true, savedAt: sw.savedAt })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Save / Unsave Book ───────────────────────────────────────────────────────

export const toggleSaveBook = async (userId: string, bookId: string) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw createError('Book not found', 404);

  const existing = await prisma.savedBook.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  if (existing) {
    await prisma.savedBook.delete({
      where: { userId_bookId: { userId, bookId } },
    });
    return { saved: false };
  } else {
    await prisma.savedBook.create({ data: { userId, bookId } });
    return { saved: true };
  }
};

export const getSavedBooks = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [savedBooks, total] = await Promise.all([
    prisma.savedBook.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { savedAt: 'desc' },
      include: {
        book: {
          include: {
            _count: { select: { topics: true } },
          },
        },
      },
    }),
    prisma.savedBook.count({ where: { userId } }),
  ]);

  return {
    data: savedBooks.map((sb) => ({ ...sb.book, isSaved: true, savedAt: sb.savedAt })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Save / Unsave Topic ──────────────────────────────────────────────────────

export const toggleSaveTopic = async (userId: string, topicId: string) => {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw createError('Topic not found', 404);

  const existing = await prisma.savedTopic.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });

  if (existing) {
    await prisma.savedTopic.delete({
      where: { userId_topicId: { userId, topicId } },
    });
    return { saved: false };
  } else {
    await prisma.savedTopic.create({ data: { userId, topicId } });
    return { saved: true };
  }
};

export const getSavedTopics = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [savedTopics, total] = await Promise.all([
    prisma.savedTopic.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { savedAt: 'desc' },
      include: {
        topic: {
          include: {
            book: { select: { id: true, title: true } },
            _count: { select: { wordTopics: true } },
          },
        },
      },
    }),
    prisma.savedTopic.count({ where: { userId } }),
  ]);

  return {
    data: savedTopics.map((st) => ({ ...st.topic, isSaved: true, savedAt: st.savedAt })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── User Progress ────────────────────────────────────────────────────────────

export const getUserProgress = async (userId: string) => {
  const now = new Date();

  const [dueToday, levelBreakdown, totalSaved] = await Promise.all([
    prisma.userWordProgress.findMany({
      where: { userId, nextReviewDate: { lte: now } },
      include: {
        word: {
          select: {
            id: true,
            japaneseWord: true,
            hiragana: true,
            meaning: true,
          },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    }),

    prisma.userWordProgress.groupBy({
      by: ['level'],
      where: { userId },
      _count: { level: true },
    }),

    prisma.savedWord.count({ where: { userId } }),
  ]);

  return {
    dueToday,
    levelBreakdown: levelBreakdown.map((l) => ({
      level: l.level,
      count: l._count.level,
    })),
    totalSaved,
    dueTodayCount: dueToday.length,
  };
};

export const getUserBadges = async (userId: string) => {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });
};
