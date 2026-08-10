import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { assertCanSaveWords } from './entitlement.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookDto {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface CreateTopicDto {
  name: string;
  bookId?: string | null;
}

export interface CreateWordDto {
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  topicIds?: string[];
  partOfSpeech?: string | null;
  jlptLevel?: string | null;
  frequency?: string | null;
  pitchAccent?: string | null;
  teForm?: string | null;
  taForm?: string | null;
  naiForm?: string | null;
  masuForm?: string | null;
  kanjiInfo?: any;
  additionalExamples?: any;
  synonyms?: string[];
  antonyms?: string[];
  nuance?: string | null;
  compounds?: any;
  homonyms?: any;
}

export interface WordListQuery {
  page?: number;
  limit?: number;
  search?: string;
  topicId?: string;
  bookId?: string;
  /**
   * Returns only what a result row shows: the word, its reading, its meaning
   * and whether it is saved.
   *
   * The full shape carries every extended field — kanji breakdowns, compounds,
   * example sentences — plus each topic the word belongs to. That is ~2.3 kB
   * per row, and the search list displays none of it. Opt-in rather than the
   * default so the detail card and the admin screens keep the full payload.
   */
  compact?: boolean;
}

// ─── Official-content Filters ────────────────────────────────────────────────

/**
 * The main dictionary shows only official, admin-curated content.
 *
 * Books and topics a learner built for themselves are reached through that
 * learner's profile instead (see community.service), so every listing here is
 * scoped to `authorId: null`. Words use their own flag because bulk uploads
 * already stamp `authorId` with the importing admin — see schema.prisma.
 */
const OFFICIAL_ONLY = { authorId: null } as const;
const OFFICIAL_WORDS_ONLY = { isUserCreated: false } as const;

// ─── Books ────────────────────────────────────────────────────────────────────

export const listBooks = async (page = 1, limit = 20, userId?: string) => {
  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where: OFFICIAL_ONLY,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { topics: true, savedBooks: true } },
        ...(userId && {
          savedBooks: { where: { userId }, select: { userId: true } },
        }),
      },
    }),
    prisma.book.count({ where: OFFICIAL_ONLY }),
  ]);

  const data = books.map((b) => {
    const { savedBooks, ...rest } = b as typeof b & { savedBooks?: { userId: string }[] };
    return {
      ...rest,
      isSaved: userId ? (savedBooks?.length ?? 0) > 0 : false,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBookById = async (id: string, userId?: string) => {
  const book = await prisma.book.findFirst({
    where: { id, ...OFFICIAL_ONLY },
    include: {
      _count: { select: { topics: true, savedBooks: true } },
      ...(userId && {
        savedBooks: { where: { userId }, select: { userId: true } },
      }),
    },
  });
  if (!book) throw createError('Book not found', 404);

  const { savedBooks, ...rest } = book as typeof book & { savedBooks?: { userId: string }[] };
  return {
    ...rest,
    isSaved: userId ? (savedBooks?.length ?? 0) > 0 : false,
  };
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

/**
 * How many words of each topic this learner has already saved.
 *
 * A topic counts as saved once every word in it is saved. Working that out
 * used to mean loading each topic's full word list into Node — on the live
 * dictionary that was 11 887 junction rows fetched, then fed back as an
 * `IN (11 887 ids)` filter, all to produce one boolean per topic. It cost
 * ~180 ms for a 9.6 kB response.
 *
 * The database can count instead. One grouped row per topic, regardless of how
 * many words the topic holds.
 */
const savedCountsByTopic = async (
  userId: string,
  topicIds: string[],
): Promise<Map<string, number>> => {
  if (topicIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ topicId: string; saved: number }[]>`
    SELECT wt.topic_id AS "topicId", COUNT(*)::int AS "saved"
    FROM word_topics wt
    JOIN saved_words sw
      ON sw.word_id = wt.word_id
     AND sw.user_id = ${userId}
    WHERE wt.topic_id = ANY(${topicIds})
    GROUP BY wt.topic_id
  `;

  return new Map(rows.map((r) => [r.topicId, r.saved]));
};

/**
 * Attaches `isSaved` to topics that already carry `_count.wordTopics`.
 *
 * An empty topic is never "saved": there is nothing in it to have saved, and
 * reporting it complete would put a dead save button on the card.
 */
const withSavedFlag = async <T extends { id: string; _count: { wordTopics: number } }>(
  topics: T[],
  userId?: string,
): Promise<(T & { isSaved: boolean })[]> => {
  if (!userId) return topics.map((t) => ({ ...t, isSaved: false }));

  const saved = await savedCountsByTopic(
    userId,
    topics.map((t) => t.id),
  );

  return topics.map((t) => ({
    ...t,
    isSaved: t._count.wordTopics > 0 && (saved.get(t.id) ?? 0) >= t._count.wordTopics,
  }));
};

export const listTopics = async (bookId?: string, userId?: string) => {
  const topics = await prisma.topic.findMany({
    where: bookId ? { bookId, ...OFFICIAL_ONLY } : OFFICIAL_ONLY,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { wordTopics: true } },
      book: { select: { id: true, title: true } },
    },
  });

  return withSavedFlag(topics, userId);
};

export const getTopicsByBook = async (bookId: string, userId?: string) => {
  const book = await prisma.book.findFirst({ where: { id: bookId, ...OFFICIAL_ONLY } });
  if (!book) throw createError('Book not found', 404);

  const topics = await prisma.topic.findMany({
    where: { bookId, ...OFFICIAL_ONLY },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { wordTopics: true } },
    },
  });

  return withSavedFlag(topics, userId);
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

  // Build where clause — user-created words never surface in the dictionary.
  const where: Record<string, unknown> = { ...OFFICIAL_WORDS_ONLY };

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

  const savedWords = userId
    ? ({ savedWords: { where: { userId }, select: { userId: true } } } as const)
    : undefined;

  const [words, total] = await Promise.all([
    query.compact
      ? prisma.word.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            japaneseWord: true,
            hiragana: true,
            meaning: true,
            ...savedWords,
          },
        })
      : prisma.word.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            wordTopics: {
              // Only `topic.name` is ever read from here. The nested book was
              // shipped with every row of every word and displayed nowhere.
              include: { topic: { select: { id: true, name: true } } },
            },
            ...savedWords,
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
  const word = await prisma.word.findFirst({
    where: {
      id,
      // Official words are visible to everyone. A user-created word is only
      // readable by the learner who wrote it or by someone who has saved it,
      // so a random id cannot be used to read other people's private words.
      OR: [
        OFFICIAL_WORDS_ONLY,
        ...(userId
          ? [
              { isUserCreated: true, authorId: userId },
              { isUserCreated: true, savedWords: { some: { userId } } },
            ]
          : []),
      ],
    },
    include: {
      wordTopics: {
        include: {
          topic: { include: { book: { select: { id: true, title: true } } } },
        },
      },
      author: { select: { id: true, username: true } },
      ...(userId && {
        savedWords: { where: { userId }, select: { userId: true } },
        wordNotes: { where: { userId }, select: { note: true } },
      }),
    },
  });

  if (!word) throw createError('Word not found', 404);

  const { savedWords, wordNotes, ...rest } = word as typeof word & {
    savedWords?: { userId: string }[];
    wordNotes?: { note: string }[];
  };

  return {
    ...rest,
    isSaved: userId ? (savedWords?.length ?? 0) > 0 : false,
    userNote: userId && wordNotes && wordNotes.length > 0 ? wordNotes[0].note : null,
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
      partOfSpeech: dto.partOfSpeech,
      jlptLevel: dto.jlptLevel,
      frequency: dto.frequency,
      pitchAccent: dto.pitchAccent,
      teForm: dto.teForm,
      taForm: dto.taForm,
      naiForm: dto.naiForm,
      masuForm: dto.masuForm,
      kanjiInfo: dto.kanjiInfo,
      additionalExamples: dto.additionalExamples,
      synonyms: dto.synonyms ?? [],
      antonyms: dto.antonyms ?? [],
      nuance: dto.nuance,
      compounds: dto.compounds,
      homonyms: dto.homonyms,
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

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Whether `userId` may save a book/topic, given its ownership and visibility.
 *
 * Official content (authorId null) is always saveable; user content only when
 * it is public or the requester owns it. Without this a learner could save —
 * and therefore read every word inside — someone else's private topic just by
 * guessing its id.
 */
const canAccess = (
  entity: { authorId: string | null; isPublic: boolean },
  userId: string,
): boolean => entity.authorId === null || entity.isPublic || entity.authorId === userId;

// ─── Save / Unsave Word ───────────────────────────────────────────────────────

export const toggleSaveWord = async (userId: string, wordId: string) => {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: {
      wordTopics: {
        select: {
          topicId: true,
          topic: { select: { authorId: true, isPublic: true } },
        },
      },
    },
  });
  if (!word) throw createError('Word not found', 404);

  // A user-created word is only reachable through a topic the requester is
  // allowed to see (or one they wrote themselves).
  if (word.isUserCreated) {
    const reachable =
      word.authorId === userId ||
      word.wordTopics.some((wt) => canAccess(wt.topic, userId));
    if (!reachable) throw createError('Word not found', 404);
  }

  const existing = await prisma.savedWord.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  let saved: boolean;
  if (existing) {
    await prisma.savedWord.delete({
      where: { userId_wordId: { userId, wordId } },
    });
    saved = false;
  } else {
    // Only the saving direction is capped — unsaving always works, so a user
    // at their ceiling can still tidy up their deck.
    await assertCanSaveWords(userId, 1);
    await prisma.savedWord.create({ data: { userId, wordId } });
    saved = true;
  }

  // For each topic this word belongs to, compute whether ALL words
  // in that topic are now saved — enables auto-sync on the frontend.
  const topicIds = word.wordTopics.map((wt) => wt.topicId);
  const topicCompletions: { topicId: string; allSaved: boolean }[] = [];

  for (const topicId of topicIds) {
    const totalInTopic = await prisma.wordTopic.count({ where: { topicId } });
    const savedInTopic = await prisma.savedWord.count({
      where: {
        userId,
        word: { wordTopics: { some: { topicId } } },
      },
    });

    const allSaved = totalInTopic > 0 && savedInTopic >= totalInTopic;
    topicCompletions.push({ topicId, allSaved });

    // Keep the SavedTopic table in step with the words, so the topic shows up
    // in (or disappears from) GET /api/users/me/saved-topics.
    if (allSaved) {
      await prisma.savedTopic.upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId },
        update: {},
      });
    } else {
      await prisma.savedTopic.deleteMany({ where: { userId, topicId } });
    }
  }

  return { saved, topicCompletions };
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
            wordNotes: { where: { userId }, select: { note: true } },
          },
        },
      },
    }),
    prisma.savedWord.count({ where: { userId } }),
  ]);

  return {
    data: savedWords.map((sw) => {
      const { wordNotes, ...wordRest } = sw.word as any;
      return {
        ...wordRest,
        isSaved: true,
        savedAt: sw.savedAt,
        userNote: wordNotes && wordNotes.length > 0 ? wordNotes[0].note : null,
      };
    }),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Save / Unsave Book ───────────────────────────────────────────────────────

export const toggleSaveBook = async (userId: string, bookId: string) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw createError('Book not found', 404);
  // 404 rather than 403 — a private book should not confirm it exists.
  if (!canAccess(book, userId)) throw createError('Book not found', 404);

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

/**
 * "Save Topic" = Batch-save ALL words belonging to that topic.
 *
 * Logic:
 *  - If the user has saved < 100% of the topic's words → INSERT the missing
 *    ones so it reaches 100%.  (skipDuplicates keeps already-saved words.)
 *  - ONLY when the user has already saved 100% → UNSAVE all of them.
 *
 * A matching SavedTopic row is written alongside the words. Without it,
 * GET /api/users/me/saved-topics (which reads the SavedTopic table) always
 * returned an empty list no matter how many topics the user had saved.
 */
export const toggleSaveTopic = async (userId: string, topicId: string) => {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      wordTopics: { select: { wordId: true } },
    },
  });
  if (!topic) throw createError('Topic not found', 404);
  // 404 rather than 403 — a private topic should not confirm it exists.
  if (!canAccess(topic, userId)) throw createError('Topic not found', 404);

  const wordIds = topic.wordTopics.map((wt) => wt.wordId);

  if (wordIds.length === 0) {
    return { saved: true, savedCount: 0, message: 'No words in this topic' };
  }

  // How many of this topic's words has the user already saved?
  const existingSavedCount = await prisma.savedWord.count({
    where: { userId, wordId: { in: wordIds } },
  });

  if (existingSavedCount === wordIds.length) {
    // ── 100% saved → UNSAVE all ──────────────────────────────────
    await prisma.$transaction([
      prisma.savedWord.deleteMany({
        where: { userId, wordId: { in: wordIds } },
      }),
      prisma.savedTopic.deleteMany({ where: { userId, topicId } }),
    ]);
    return {
      saved: false,
      savedCount: 0,
      message: `Removed ${wordIds.length} words from saved`,
    };
  } else {
    // ── < 100% saved → FILL the missing words ────────────────────
    // Checked against the number actually being added, not one at a time:
    // saving a 60-word topic must not slip past a 500-word ceiling.
    await assertCanSaveWords(userId, wordIds.length - existingSavedCount);

    await prisma.$transaction([
      prisma.savedWord.createMany({
        data: wordIds.map((wordId) => ({ userId, wordId })),
        skipDuplicates: true,
      }),
      prisma.savedTopic.upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId },
        update: {},
      }),
    ]);
    const newlySaved = wordIds.length - existingSavedCount;
    return {
      saved: true,
      savedCount: wordIds.length,
      message: `Saved ${newlySaved} new word${newlySaved !== 1 ? 's' : ''} (${wordIds.length} total in topic)`,
    };
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

export const upsertWordNote = async (userId: string, wordId: string, note: string) => {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw createError('Word not found', 404);

  return prisma.userWordNote.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId, note },
    update: { note },
  });
};
