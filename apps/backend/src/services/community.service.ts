import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

/**
 * Browsing other learners' shared material.
 *
 * Only public content is ever exposed here, and only users who actually have
 * some are listed — the dictionary's "Foydalanuvchilar" tab is a directory of
 * shared study material, not a user directory, so learners who have shared
 * nothing stay unlisted.
 */

/** Public profile fields. Email, phone and role are deliberately absent. */
const PUBLIC_USER_FIELDS = {
  id: true,
  username: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// ─── Directory ────────────────────────────────────────────────────────────────

export const listPublicAuthors = async (search?: string, page = 1, limit = 24) => {
  const skip = (page - 1) * limit;

  const where = {
    // Same rule as the profile below: a learner is only listed once they have
    // something worth opening — a topic with words in it, or a book.
    OR: [
      { topics: { some: { isPublic: true, wordTopics: { some: {} } } } },
      { books: { some: { isPublic: true } } },
    ],
    ...(search
      ? { username: { contains: search, mode: 'insensitive' as const } }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { username: 'asc' },
      select: {
        ...PUBLIC_USER_FIELDS,
        _count: {
          select: {
            topics: { where: { isPublic: true, wordTopics: { some: {} } } },
            books: { where: { isPublic: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      publicTopics: u._count.topics,
      publicBooks: u._count.books,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * A learner's public profile: a couple of headline facts plus the books and
 * topics they have shared.
 *
 * `viewerId` only affects the `isSaved` flags — visibility is not relaxed for
 * anyone, including the owner, so what you see here is exactly what everyone
 * else sees. (Owners manage their own material under /api/library.)
 */
export const getPublicProfile = async (username: string, viewerId?: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      ...PUBLIC_USER_FIELDS,
      profile: { select: { streak: true, xp: true, league: true } },
    },
  });

  if (!user) throw createError('Foydalanuvchi topilmadi', 404);

  const [books, topics, wordCount] = await Promise.all([
    prisma.book.findMany({
      where: { authorId: user.id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { topics: true } },
        ...(viewerId && {
          savedBooks: { where: { userId: viewerId }, select: { userId: true } },
        }),
      },
    }),
    prisma.topic.findMany({
      // Empty topics are hidden even when public: there is nothing to preview
      // and saving one would add no words, so it would just be a dead button.
      // The author still sees it under /library, where it is theirs to fill in.
      where: { authorId: user.id, isPublic: true, wordTopics: { some: {} } },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { wordTopics: true } },
        book: { select: { id: true, title: true } },
        wordTopics: { select: { wordId: true } },
      },
    }),
    prisma.word.count({ where: { authorId: user.id, isUserCreated: true } }),
  ]);

  // A topic counts as saved once the viewer has every one of its words —
  // the same rule toggleSaveTopic uses, so the button state stays honest.
  let savedWordIds = new Set<string>();
  if (viewerId) {
    const allWordIds = topics.flatMap((t) => t.wordTopics.map((wt) => wt.wordId));
    if (allWordIds.length > 0) {
      const saved = await prisma.savedWord.findMany({
        where: { userId: viewerId, wordId: { in: allWordIds } },
        select: { wordId: true },
      });
      savedWordIds = new Set(saved.map((s) => s.wordId));
    }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      streak: user.profile?.streak ?? 0,
      xp: user.profile?.xp ?? 0,
      league: user.profile?.league ?? 'BRONZE',
      publicTopics: topics.length,
      publicBooks: books.length,
      totalWords: wordCount,
    },
    books: books.map((b) => {
      const { savedBooks, ...rest } = b as typeof b & { savedBooks?: { userId: string }[] };
      return { ...rest, isSaved: (savedBooks?.length ?? 0) > 0 };
    }),
    topics: topics.map(({ wordTopics, ...t }) => ({
      ...t,
      isSaved:
        viewerId !== undefined &&
        wordTopics.length > 0 &&
        wordTopics.every((wt) => savedWordIds.has(wt.wordId)),
    })),
  };
};

// ─── Topic preview ────────────────────────────────────────────────────────────

/**
 * The words inside a public topic, so a learner can see what they are about to
 * save. Private topics are reported as missing rather than forbidden.
 */
export const getPublicTopicWords = async (topicId: string) => {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, isPublic: true },
    include: {
      author: { select: { id: true, username: true } },
      wordTopics: {
        include: {
          word: {
            select: {
              id: true,
              japaneseWord: true,
              hiragana: true,
              meaning: true,
              exampleSentence: true,
              exampleTranslation: true,
            },
          },
        },
      },
    },
  });

  if (!topic) throw createError('Mavzu topilmadi', 404);

  return {
    id: topic.id,
    name: topic.name,
    author: topic.author,
    words: topic.wordTopics.map((wt) => wt.word),
  };
};
