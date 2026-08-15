import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { Role } from '@prisma/client';
import { invalidateMaintenanceCache } from '../middleware/maintenance.middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulkWordRow {
  japanese_word: string;
  hiragana?: string;
  meaning: string;
  example_sentence?: string;
  example_translation?: string;
  part_of_speech?: string;
  jlpt_level?: string;
  frequency?: string;
  pitch_accent?: string;
  te_form?: string;
  ta_form?: string;
  nai_form?: string;
  masu_form?: string;
  kanji_info?: any;
  additional_examples?: any;
  synonyms?: string[];
  antonyms?: string[];
  nuance?: string;
  compounds?: any;
  homonyms?: any;
  topic_name?: string;
}

export interface BulkUploadResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses an uploaded CSV or Excel file buffer into an array of raw row objects.
 * Accepts .csv, .xlsx, and .xls formats (detected by content, not extension).
 */
export const parseSpreadsheet = (buffer: Buffer): Record<string, unknown>[] => {
  let cleanBuffer = buffer;
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    cleanBuffer = buffer.subarray ? buffer.subarray(3) : buffer.slice(3);
  }
  const workbook = XLSX.read(cleanBuffer, { type: 'buffer', codepage: 65001 });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw createError('Uploaded file has no sheets', 400);
  }

  const sheet = workbook.Sheets[sheetName];
  // header: 1 → first row treated as column names
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    throw createError('Uploaded file is empty or has no data rows', 400);
  }

  return rows;
};

/**
 * Normalises and validates a single row from the spreadsheet.
 * Returns null if the row should be silently skipped (all fields blank).
 */
const normaliseRow = (
  raw: Record<string, unknown>,
  rowIndex: number,
): { data: BulkWordRow; error?: never } | { error: string; data?: never } => {
  // Normalize keys in raw: trim, lowercase, remove surrounding quotes
  const cleanRaw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = key.trim().toLowerCase().replace(/^["']|["']$/g, '');
    cleanRaw[cleanKey] = value;
  }

  const getVal = (keys: string[]): unknown => {
    for (const k of keys) {
      const cleanK = k.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
      // Match cleanRaw keys using the same clean format
      for (const [rk, rv] of Object.entries(cleanRaw)) {
        const cleanRk = rk.replace(/_/g, '').replace(/\s+/g, '');
        if (cleanRk === cleanK) {
          return rv;
        }
      }
    }
    return undefined;
  };

  const japaneseWord = String(getVal(['japanese_word', 'japanese word', 'word']) ?? '').trim();
  const meaning = String(getVal(['meaning']) ?? '').trim();
  const hiragana = String(getVal(['hiragana']) ?? '').trim() || undefined;
  const exampleSentence = String(getVal(['example_sentence', 'example sentence']) ?? '').trim() || undefined;
  const exampleTranslation = String(getVal(['example_translation', 'example translation']) ?? '').trim() || undefined;

  const partOfSpeech = String(getVal(['part_of_speech', 'partOfSpeech', 'soz_turi', 'soz turi']) ?? '').trim() || undefined;
  const jlptLevel = String(getVal(['jlpt_level', 'jlptLevel']) ?? '').trim() || undefined;
  const frequency = String(getVal(['frequency']) ?? '').trim() || undefined;
  const pitchAccent = String(getVal(['pitch_accent', 'pitchAccent']) ?? '').trim() || undefined;
  
  const teForm = String(getVal(['te_form', 'teForm']) ?? '').trim() || undefined;
  const taForm = String(getVal(['ta_form', 'taForm']) ?? '').trim() || undefined;
  const naiForm = String(getVal(['nai_form', 'naiForm']) ?? '').trim() || undefined;
  const masuForm = String(getVal(['masu_form', 'masuForm']) ?? '').trim() || undefined;

  const parseJsonSafe = (val: unknown) => {
    if (!val) return undefined;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(String(val).trim());
    } catch {
      return undefined;
    }
  };

  const parseList = (val: unknown): string[] | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return undefined;
  };

  const kanjiInfo = parseJsonSafe(getVal(['kanji_info', 'kanjiInfo']));
  const additionalExamples = parseJsonSafe(getVal(['additional_examples', 'additionalExamples']));
  const compounds = parseJsonSafe(getVal(['compounds']));
  const homonyms = parseJsonSafe(getVal(['homonyms', 'homonimlar']));
  const synonyms = parseList(getVal(['synonyms', 'sinonimlar']));
  const antonyms = parseList(getVal(['antonyms', 'antonimlar']));
  const nuance = String(getVal(['nuance', 'nuans']) ?? '').trim() || undefined;
  const topicName = String(getVal(['topic_name', 'topic', 'mavzu']) ?? '').trim() || undefined;

  if (!japaneseWord && !meaning) return { error: 'blank row' };
  if (!japaneseWord) return { error: `Row ${rowIndex}: missing "japanese_word"` };
  if (!meaning) return { error: `Row ${rowIndex}: missing "meaning"` };
  if (japaneseWord.length > 100) return { error: `Row ${rowIndex}: "japanese_word" exceeds 100 characters` };
  if (meaning.length > 500) return { error: `Row ${rowIndex}: "meaning" exceeds 500 characters` };

  return {
    data: {
      japanese_word: japaneseWord,
      hiragana,
      meaning,
      example_sentence: exampleSentence,
      example_translation: exampleTranslation,
      part_of_speech: partOfSpeech,
      jlpt_level: jlptLevel,
      frequency,
      pitch_accent: pitchAccent,
      te_form: teForm,
      ta_form: taForm,
      nai_form: naiForm,
      masu_form: masuForm,
      kanji_info: kanjiInfo,
      additional_examples: additionalExamples,
      synonyms,
      antonyms,
      nuance,
      compounds,
      homonyms,
      topic_name: topicName,
    },
  };
};

// ─── 1. Bulk Upload — Global Words ───────────────────────────────────────────

/**
 * Parses the uploaded file and inserts all valid rows as Words in the DB.
 * Optionally attaches each word to the provided `topicIds`.
 * Deduplicates: skips rows where `japaneseWord` already exists in the DB.
 */
export const bulkUploadWords = async (
  buffer: Buffer,
  authorId: string,
  topicIds?: string[],
): Promise<BulkUploadResult> => {
  const rawRows = parseSpreadsheet(buffer);

  const result: BulkUploadResult = { created: 0, skipped: 0, errors: [] };

  // Validate topic IDs if supplied
  if (topicIds && topicIds.length > 0) {
    const topics = await prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true },
    });
    if (topics.length !== topicIds.length) {
      throw createError('One or more topicIds are invalid', 400);
    }
  }

  // Collect all valid rows first (fail-fast on row parsing errors is opt-in)
  const validRows: BulkWordRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const norm = normaliseRow(rawRows[i]!, i + 2); // +2 = header is row 1
    if (norm.error) {
      if (norm.error === 'blank row') {
        result.skipped++;
      } else {
        result.errors.push({ row: i + 2, message: norm.error });
      }
      continue;
    }
    validRows.push(norm.data as BulkWordRow);
  }

  if (validRows.length === 0) {
    return result;
  }

  // Fetch existing words to detect duplicates (by japaneseWord, case-sensitive)
  const candidateWords = validRows.map((r) => r.japanese_word);
  const existingWords = await prisma.word.findMany({
    where: { japaneseWord: { in: candidateWords } },
    select: { id: true, japaneseWord: true },
  });
  const existingWordMap = new Map<string, string>(
    existingWords.map((w) => [w.japaneseWord, w.id])
  );

  // Retrieve existing WordTopic links for candidate words to prevent duplicate junction links
  let existingLinksSet = new Set<string>(); // key: "wordId-topicId"
  if (existingWords.length > 0) {
    const existingWordIds = existingWords.map((w) => w.id);
    const existingLinks = await prisma.wordTopic.findMany({
      where: {
        wordId: { in: existingWordIds },
      },
      select: { wordId: true, topicId: true },
    });
    existingLinksSet = new Set(
      existingLinks.map((l) => `${l.wordId}-${l.topicId}`)
    );
  }

  // Local cache for resolved global topics (name -> topicId)
  const globalTopicCache = new Map<string, string>();

  // Position each word takes inside its topic. Rows are numbered in file order
  // — for a textbook that is the lesson's own order — and an upload into a
  // topic that already holds words appends after them rather than interleaving.
  const nextOrder = new Map<string, number>();
  const takeOrder = async (topicId: string): Promise<number> => {
    if (!nextOrder.has(topicId)) {
      const last = await prisma.wordTopic.aggregate({
        where: { topicId },
        _max: { sortOrder: true },
      });
      nextOrder.set(topicId, (last._max.sortOrder ?? 0) + 1);
    }
    const order = nextOrder.get(topicId)!;
    nextOrder.set(topicId, order + 1);
    return order;
  };

  // Process each row
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i]!;
    
    // Resolve row-specific topic if present
    let rowTopicId: string | undefined = undefined;
    if (row.topic_name) {
      const cacheKey = row.topic_name.toLowerCase().trim();
      if (globalTopicCache.has(cacheKey)) {
        rowTopicId = globalTopicCache.get(cacheKey);
      } else {
        let topic = await prisma.topic.findFirst({
          where: {
            name: { equals: row.topic_name, mode: 'insensitive' },
            bookId: null,
          },
        });
        if (!topic) {
          topic = await prisma.topic.create({
            data: { name: row.topic_name, bookId: null },
          });
        }
        globalTopicCache.set(cacheKey, topic.id);
        rowTopicId = topic.id;
      }
    }

    const existingId = existingWordMap.get(row.japanese_word);
    const allTargetTopicIds = [
      ...(topicIds ?? []),
      ...(rowTopicId ? [rowTopicId] : []),
    ];

    if (existingId) {
      if (allTargetTopicIds.length > 0) {
        // Find which target topics the existing word is not yet linked to
        const topicsToLink = allTargetTopicIds.filter(
          (topicId) => !existingLinksSet.has(`${existingId}-${topicId}`)
        );

        if (topicsToLink.length > 0) {
          try {
            const links = [];
            for (const topicId of topicsToLink) {
              links.push({ wordId: existingId, topicId, sortOrder: await takeOrder(topicId) });
            }
            await prisma.wordTopic.createMany({ data: links });

            // Add the new links to our memory set so we don't try to insert them again
            for (const topicId of topicsToLink) {
              existingLinksSet.add(`${existingId}-${topicId}`);
            }

            result.created++;
            continue;
          } catch (err) {
            result.errors.push({
              row: i + 2,
              message: `Failed to link existing word "${row.japanese_word}" to topic: ${(err as Error).message}`,
            });
            continue;
          }
        }
      }

      // If it already exists in the dictionary and is already linked to the target topic(s), it is skipped
      result.skipped++;
      continue;
    }

    const newLinks = [];
    for (const topicId of allTargetTopicIds) {
      newLinks.push({ topicId, sortOrder: await takeOrder(topicId) });
    }

    try {
      await prisma.word.create({
        data: {
          japaneseWord: row.japanese_word,
          hiragana: row.hiragana ?? '',
          meaning: row.meaning,
          exampleSentence: row.example_sentence,
          exampleTranslation: row.example_translation,
          authorId,
          partOfSpeech: row.part_of_speech,
          jlptLevel: row.jlpt_level,
          frequency: row.frequency,
          pitchAccent: row.pitch_accent,
          teForm: row.te_form,
          taForm: row.ta_form,
          naiForm: row.nai_form,
          masuForm: row.masu_form,
          kanjiInfo: row.kanji_info,
          additionalExamples: row.additional_examples,
          synonyms: row.synonyms ?? [],
          antonyms: row.antonyms ?? [],
          nuance: row.nuance,
          compounds: row.compounds,
          homonyms: row.homonyms,
          ...(newLinks.length > 0 && { wordTopics: { create: newLinks } }),
        },
      });
      result.created++;
    } catch (err) {
      result.errors.push({
        row: i + 2,
        message: `Failed to insert "${row.japanese_word}": ${(err as Error).message}`,
      });
    }
  }

  return result;
};

// ─── 2. Bulk Upload — Book Words ──────────────────────────────────────────────

/**
 * Same as `bulkUploadWords` but requires a book + topic context.
 * Creates the topic if it doesn't already exist under the given book.
 * Every uploaded word is linked to that topic.
 */
export const bulkUploadBookWords = async (
  buffer: Buffer,
  authorId: string,
  bookId: string,
  topicName: string,
): Promise<BulkUploadResult> => {
  // Validate book
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw createError('Book not found', 404);

  // Find or create topic under this book
  let topic = await prisma.topic.findFirst({
    where: { name: topicName, bookId },
  });

  if (!topic) {
    topic = await prisma.topic.create({
      data: { name: topicName, bookId },
    });
  }

  return bulkUploadWords(buffer, authorId, [topic.id]);
};

// ─── 3. User Management ───────────────────────────────────────────────────────

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
}

export const listUsers = async (query: ListUsersQuery = {}) => {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { username: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.role) {
    where.role = query.role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        tier: true,
        premiumUntil: true,
        profile: {
          select: {
            streak: true,
            coins: true,
            xp: true,
            league: true,
            lastLoginDate: true,
          },
        },
        _count: {
          select: {
            savedWords: true,
            badges: true,
            gameSessions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const setUserRole = async (targetUserId: string, role: Role) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw createError('User not found', 404);

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: { id: true, username: true, email: true, role: true },
  });
};

export const deleteUser = async (targetUserId: string, requestingUserId: string) => {
  if (targetUserId === requestingUserId) {
    throw createError('You cannot delete your own account', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw createError('User not found', 404);

  await prisma.user.delete({ where: { id: targetUserId } });
};

// ─── 4. Site Configuration ────────────────────────────────────────────────────

export const getAllConfig = async () => {
  const configs = await prisma.siteConfiguration.findMany({
    orderBy: { key: 'asc' },
  });
  // Return as a clean key→value map
  return Object.fromEntries(configs.map((c) => [c.key, c.value]));
};

export const getConfigValue = async (key: string) => {
  const config = await prisma.siteConfiguration.findUnique({ where: { key } });
  if (!config) throw createError(`Config key "${key}" not found`, 404);
  return config;
};

export const upsertConfig = async (
  entries: Record<string, string>,
): Promise<Record<string, string>> => {
  if (Object.keys(entries).length === 0) {
    throw createError('No config entries provided', 400);
  }

  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.siteConfiguration.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );

  // The gate caches its flag for a few seconds; drop it so an admin flipping
  // maintenance mode sees the effect on the very next request.
  invalidateMaintenanceCache();

  return getAllConfig();
};

export const deleteConfig = async (key: string) => {
  const config = await prisma.siteConfiguration.findUnique({ where: { key } });
  if (!config) throw createError(`Config key "${key}" not found`, 404);
  await prisma.siteConfiguration.delete({ where: { key } });
  invalidateMaintenanceCache();
};

// ─── 5. Platform Statistics ───────────────────────────────────────────────────

export const getPlatformStats = async () => {
  const [
    totalUsers,
    totalWords,
    totalBooks,
    totalTopics,
    totalGameSessions,
    totalSavedWords,
    leagueDistribution,
    recentRegistrations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.word.count(),
    prisma.book.count(),
    prisma.topic.count(),
    prisma.gameSession.count({ where: { completed: true } }),
    prisma.savedWord.count(),

    // Users per league tier
    prisma.profile.groupBy({
      by: ['league'],
      _count: { league: true },
    }),

    // New users in the last 7 days
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Weekly stats totals
  const { start } = getCurrentWeekBoundsLocal();
  const weeklyTotals = await prisma.weeklyStat.aggregate({
    where: { startDate: start },
    _sum: {
      gamesPlayed: true,
      coinsEarned: true,
      xpEarned: true,
      wordsLearned: true,
    },
  });

  return {
    totals: {
      users: totalUsers,
      words: totalWords,
      books: totalBooks,
      topics: totalTopics,
      completedGameSessions: totalGameSessions,
      savedWords: totalSavedWords,
      newUsersThisWeek: recentRegistrations,
    },
    leagueDistribution: leagueDistribution.map((l) => ({
      league: l.league,
      count: l._count.league,
    })),
    currentWeek: {
      gamesPlayed: weeklyTotals._sum.gamesPlayed ?? 0,
      coinsEarned: weeklyTotals._sum.coinsEarned ?? 0,
      xpEarned: weeklyTotals._sum.xpEarned ?? 0,
      wordsLearned: weeklyTotals._sum.wordsLearned ?? 0,
    },
  };
};

/** Local copy to avoid circular import from game.service */
const getCurrentWeekBoundsLocal = () => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
};
