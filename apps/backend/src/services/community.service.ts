import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { effectiveTier } from './entitlement.service';

/**
 * Browsing other learners' shared material.
 *
 * Only public content is ever exposed here, and only users who actually have
 * some are listed — the dictionary's "Foydalanuvchilar" tab is a directory of
 * shared study material, not a user directory, so learners who have shared
 * nothing stay unlisted.
 */

/**
 * Public profile fields. Email, phone and role are deliberately absent.
 *
 * `tier` and `premiumUntil` are selected only to derive the subscriber badge —
 * they are folded into a plain `isPremium` boolean before anything is returned,
 * so a renewal date never reaches another learner's screen.
 */
const PUBLIC_USER_FIELDS = {
  id: true,
  username: true,
  avatarUrl: true,
  createdAt: true,
  tier: true,
  premiumUntil: true,
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
      isPremium: effectiveTier(u) !== 'FREE',
      publicTopics: u._count.topics,
      publicBooks: u._count.books,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * The learners whose shared material other people have saved the most.
 *
 * Written as raw SQL because the ranking is a sum of counts across a relation
 * (saves per topic, summed per author) — Prisma can count a relation but not
 * order by an aggregate of one, so the alternative would be fetching every
 * author and sorting in memory.
 *
 * Self-saves are excluded: saving your own topic says nothing about whether
 * anyone else found it useful.
 *
 * There is deliberately no `HAVING saves > 0`. On a young install nobody has
 * saved anything yet, and an empty "popular" strip is worse than one ordered
 * by how much material each author has actually shared.
 */
export const listPopularAuthors = async (limit = 6) => {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      username: string;
      avatarUrl: string | null;
      createdAt: Date;
      tier: string;
      premiumUntil: Date | null;
      publicTopics: number;
      publicBooks: number;
      saves: number;
    }[]
  >`
    SELECT
      u.id,
      u.username,
      u.avatar_url                          AS "avatarUrl",
      u.created_at                          AS "createdAt",
      u.tier::text                          AS "tier",
      u.premium_until                       AS "premiumUntil",
      (SELECT COUNT(*)::int FROM topics t2
         WHERE t2.author_id = u.id AND t2.is_public = true
           AND EXISTS (SELECT 1 FROM word_topics wt2 WHERE wt2.topic_id = t2.id)
      )                                     AS "publicTopics",
      (SELECT COUNT(*)::int FROM books b
         WHERE b.author_id = u.id AND b.is_public = true
      )                                     AS "publicBooks",
      COUNT(st.user_id)::int                AS "saves"
    FROM users u
    JOIN topics t
      ON t.author_id = u.id
     AND t.is_public = true
     AND EXISTS (SELECT 1 FROM word_topics wt WHERE wt.topic_id = t.id)
    LEFT JOIN saved_topics st
      ON st.topic_id = t.id
     AND st.user_id <> u.id
    GROUP BY u.id
    ORDER BY "saves" DESC, "publicTopics" DESC, u.username ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    avatarUrl: r.avatarUrl,
    createdAt: r.createdAt,
    isPremium: effectiveTier({ tier: r.tier as never, premiumUntil: r.premiumUntil }) !== 'FREE',
    publicTopics: r.publicTopics,
    publicBooks: r.publicBooks,
    /** How many other learners have saved one of their topics. */
    saves: r.saves,
  }));
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
      isPremium: effectiveTier(user) !== 'FREE',
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
