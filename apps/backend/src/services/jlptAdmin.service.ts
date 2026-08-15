import { JlptLevel, JlptSection, JlptQuestionType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

/**
 * Writing side of the JLPT bank.
 *
 * Everything here is admin-only and, unlike the learner-facing service, it
 * deliberately hands back the answer key — you cannot check a paper you cannot
 * see. New material is created unpublished so a half-typed test never reaches
 * a learner; publishing is a separate, explicit act.
 */

// ─── Tests ────────────────────────────────────────────────────────────────────

/** Every test of a level and section, drafts included, for the admin list. */
export const listTests = async (level: JlptLevel, section: JlptSection) => {
  const tests = await prisma.jlptTest.findMany({
    where: { level, section },
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      title: true,
      minutes: true,
      isPublished: true,
      updatedAt: true,
      groups: { select: { _count: { select: { questions: true } } } },
    },
  });

  return tests.map(({ groups, ...t }) => ({
    ...t,
    groupCount: groups.length,
    questionCount: groups.reduce((n, g) => n + g._count.questions, 0),
  }));
};

/** The next free number in a section, so the admin never picks one by hand. */
const nextNumber = async (level: JlptLevel, section: JlptSection) => {
  const last = await prisma.jlptTest.findFirst({
    where: { level, section },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
};

/** Default minutes per section, matching the real paper. */
const DEFAULT_MINUTES: Record<JlptSection, number> = {
  MOJI_GOI: 20,
  BUNPOU: 20,
  DOKKAI: 20,
  CHOUKAI: 30,
};

export const createTest = async (data: {
  level: JlptLevel;
  section: JlptSection;
  title?: string;
  minutes?: number;
}) => {
  const number = await nextNumber(data.level, data.section);
  return prisma.jlptTest.create({
    data: {
      level: data.level,
      section: data.section,
      number,
      title: data.title?.trim() || null,
      minutes: data.minutes ?? DEFAULT_MINUTES[data.section],
      isPublished: false,
    },
  });
};

export const updateTest = async (
  id: string,
  data: { title?: string | null; minutes?: number; isPublished?: boolean },
) => {
  const test = await prisma.jlptTest.findUnique({
    where: { id },
    include: { groups: { select: { _count: { select: { questions: true } } } } },
  });
  if (!test) throw createError('Test topilmadi', 404);

  // Publishing an empty paper would show a learner a test with nothing in it.
  if (data.isPublished) {
    const questions = test.groups.reduce((n, g) => n + g._count.questions, 0);
    if (questions === 0) {
      throw createError('Boʻsh testni nashr qilib boʻlmaydi — avval savol qoʻshing', 400);
    }
  }

  return prisma.jlptTest.update({ where: { id }, data });
};

export const deleteTest = (id: string) => prisma.jlptTest.delete({ where: { id } });

/** The whole paper with the key, for the editor. */
export const getTestForEdit = async (id: string) => {
  const test = await prisma.jlptTest.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { number: 'asc' },
        include: {
          questions: {
            orderBy: { number: 'asc' },
            include: { choices: { orderBy: { number: 'asc' } } },
          },
        },
      },
    },
  });
  if (!test) throw createError('Test topilmadi', 404);
  return test;
};

// ─── Groups (もんだい) ────────────────────────────────────────────────────────

export const createGroup = async (
  testId: string,
  data: {
    type: JlptQuestionType;
    instruction: string;
    instructionUz?: string;
    passage?: string;
    imageUrl?: string;
    audioUrl?: string;
  },
) => {
  const last = await prisma.jlptQuestionGroup.findFirst({
    where: { testId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  return prisma.jlptQuestionGroup.create({
    data: { testId, number, sortOrder: number, ...data },
  });
};

export const updateGroup = (id: string, data: Prisma.JlptQuestionGroupUpdateInput) =>
  prisma.jlptQuestionGroup.update({ where: { id }, data });

export const deleteGroup = (id: string) =>
  prisma.jlptQuestionGroup.delete({ where: { id } });

// ─── Questions ────────────────────────────────────────────────────────────────

export interface QuestionInput {
  stem: string;
  focus?: string;
  transcript?: string;
  imageUrl?: string;
  audioUrl?: string;
  explanationUz?: string;
  choices: string[];
  /** 1-based index of the correct choice. */
  answer: number;
}

/**
 * Question numbers run across the whole test, not per group — that is how the
 * paper prints them, and the runner shows them the same way.
 */
const nextQuestionNumber = async (testId: string) => {
  const groups = await prisma.jlptQuestionGroup.findMany({
    where: { testId },
    select: { id: true },
  });
  const last = await prisma.jlptQuestion.findFirst({
    where: { groupId: { in: groups.map((g) => g.id) } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
};

const validate = (q: QuestionInput) => {
  if (q.choices.length < 2) throw createError('Kamida 2 ta variant kerak', 400);
  if (q.choices.some((c) => !c.trim())) throw createError('Boʻsh variant qoldirib boʻlmaydi', 400);
  if (q.answer < 1 || q.answer > q.choices.length) {
    throw createError('Toʻgʻri javob raqami notoʻgʻri', 400);
  }
};

export const createQuestion = async (groupId: string, q: QuestionInput) => {
  validate(q);
  const group = await prisma.jlptQuestionGroup.findUnique({
    where: { id: groupId },
    select: { testId: true },
  });
  if (!group) throw createError('Boʻlim topilmadi', 404);

  return prisma.jlptQuestion.create({
    data: {
      groupId,
      number: await nextQuestionNumber(group.testId),
      stem: q.stem,
      focus: q.focus || null,
      transcript: q.transcript || null,
      imageUrl: q.imageUrl || null,
      audioUrl: q.audioUrl || null,
      explanationUz: q.explanationUz || null,
      choices: {
        create: q.choices.map((text, i) => ({
          number: i + 1,
          text,
          isCorrect: i + 1 === q.answer,
        })),
      },
    },
    include: { choices: { orderBy: { number: 'asc' } } },
  });
};

export const updateQuestion = async (id: string, q: QuestionInput) => {
  validate(q);
  // Choices are replaced wholesale: editing four options in place would need
  // stable ids the form does not have, and a question never has many.
  await prisma.jlptChoice.deleteMany({ where: { questionId: id } });

  return prisma.jlptQuestion.update({
    where: { id },
    data: {
      stem: q.stem,
      focus: q.focus || null,
      transcript: q.transcript || null,
      imageUrl: q.imageUrl || null,
      audioUrl: q.audioUrl || null,
      explanationUz: q.explanationUz || null,
      choices: {
        create: q.choices.map((text, i) => ({
          number: i + 1,
          text,
          isCorrect: i + 1 === q.answer,
        })),
      },
    },
    include: { choices: { orderBy: { number: 'asc' } } },
  });
};

export const deleteQuestion = (id: string) =>
  prisma.jlptQuestion.delete({ where: { id } });

// ─── Bulk import ──────────────────────────────────────────────────────────────

export interface ImportRow {
  mondai: number;
  type: JlptQuestionType;
  instruction?: string;
  instructionUz?: string;
  passage?: string;
  stem: string;
  focus?: string;
  choices: string[];
  answer: number;
  explanationUz?: string;
}

/**
 * Writes a spreadsheet's worth of rows into one test.
 *
 * Rows carry their もんだい number; the first row of each one also carries its
 * instruction and any shared passage, and later rows may leave those blank.
 * The whole import runs in a transaction — a file that fails halfway leaves
 * the test exactly as it was rather than half-filled.
 */
export const importRows = async (testId: string, rows: ImportRow[]) => {
  if (rows.length === 0) throw createError('Faylda savol topilmadi', 400);

  const test = await prisma.jlptTest.findUnique({ where: { id: testId } });
  if (!test) throw createError('Test topilmadi', 404);

  const byMondai = new Map<number, ImportRow[]>();
  for (const r of rows) {
    if (!byMondai.has(r.mondai)) byMondai.set(r.mondai, []);
    byMondai.get(r.mondai)!.push(r);
  }

  return prisma.$transaction(async (tx) => {
    // Replace rather than append: re-uploading a corrected file should not
    // leave the previous attempt's questions behind.
    await tx.jlptQuestionGroup.deleteMany({ where: { testId } });

    let questionNumber = 0;
    let groupCount = 0;

    for (const [mondai, groupRows] of [...byMondai.entries()].sort((a, b) => a[0] - b[0])) {
      const head = groupRows.find((r) => r.instruction) ?? groupRows[0];
      const passage = groupRows.find((r) => r.passage)?.passage;

      const group = await tx.jlptQuestionGroup.create({
        data: {
          testId,
          number: mondai,
          sortOrder: mondai,
          type: head.type,
          instruction: head.instruction ?? '',
          instructionUz: head.instructionUz ?? null,
          passage: passage ?? null,
        },
      });
      groupCount++;

      for (const r of groupRows) {
        validate({ stem: r.stem, choices: r.choices, answer: r.answer });
        questionNumber++;
        await tx.jlptQuestion.create({
          data: {
            groupId: group.id,
            number: questionNumber,
            stem: r.stem,
            focus: r.focus || null,
            explanationUz: r.explanationUz || null,
            choices: {
              create: r.choices.map((text, i) => ({
                number: i + 1,
                text,
                isCorrect: i + 1 === r.answer,
              })),
            },
          },
        });
      }
    }

    return { groups: groupCount, questions: questionNumber };
  });
};
