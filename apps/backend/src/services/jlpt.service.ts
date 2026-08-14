import { JlptLevel, JlptSection, JlptAttemptStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

/**
 * JLPT mock exams.
 *
 * The one rule worth stating up front: the clock is not kept in memory. An
 * attempt stores when it started and how long it may run, and the deadline is
 * derived from those two columns whenever a request arrives. Nothing polls,
 * nothing is held per user, and closing the browser changes nothing — which is
 * exactly why walking out mid-exam buys the learner no extra time.
 */

// ─── Timing ───────────────────────────────────────────────────────────────────

/** Seconds of slack allowed past the deadline, to forgive network latency. */
const GRACE_SECONDS = 10;

export interface AttemptTiming {
  /** When the clock started — the resume point after a pause. */
  startedAt: Date;
  /** Total minutes this attempt is allowed. */
  minutes: number;
  /** Seconds left, floored at zero. */
  remainingSeconds: number;
  expired: boolean;
}

export const timingFor = (attempt: {
  startedAt: Date;
  minutes: number;
}): AttemptTiming => {
  const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000;
  const total = attempt.minutes * 60;
  const remaining = Math.max(0, Math.ceil(total - elapsed));
  return {
    startedAt: attempt.startedAt,
    minutes: attempt.minutes,
    remainingSeconds: remaining,
    expired: elapsed > total + GRACE_SECONDS,
  };
};

// ─── Browsing ─────────────────────────────────────────────────────────────────

/** Every published test of a level, grouped by section, for the JLPT page. */
export const listTests = async (
  level: JlptLevel,
  includeDrafts = false,
  userId?: string,
) => {
  const tests = await prisma.jlptTest.findMany({
    where: { level, ...(includeDrafts ? {} : { isPublished: true }) },
    orderBy: [{ section: 'asc' }, { number: 'asc' }],
    select: {
      id: true,
      section: true,
      number: true,
      title: true,
      minutes: true,
      isPublished: true,
      _count: { select: { groups: true } },
    },
  });

  // Question counts need one more hop — groups hold the questions.
  const counts = await prisma.jlptQuestion.groupBy({
    by: ['groupId'],
    _count: { _all: true },
  });
  const groups = await prisma.jlptQuestionGroup.findMany({
    where: { testId: { in: tests.map((t) => t.id) } },
    select: { id: true, testId: true },
  });
  const perTest = new Map<string, number>();
  for (const g of groups) {
    const n = counts.find((c) => c.groupId === g.id)?._count._all ?? 0;
    perTest.set(g.testId, (perTest.get(g.testId) ?? 0) + n);
  }

  // The learner's own best result per test, so the catalogue can show it on
  // the card. Anonymous visitors simply get nulls.
  const best = new Map<string, { score: number; maxScore: number }>();
  if (userId) {
    const done = await prisma.jlptAttempt.findMany({
      where: {
        userId,
        status: JlptAttemptStatus.COMPLETED,
        testId: { in: tests.map((t) => t.id) },
      },
      select: { testId: true, score: true, maxScore: true },
    });
    for (const a of done) {
      if (!a.testId || a.score === null || a.maxScore === null) continue;
      const prev = best.get(a.testId);
      if (!prev || a.score > prev.score) {
        best.set(a.testId, { score: a.score, maxScore: a.maxScore });
      }
    }
  }

  return tests.map((t) => ({
    id: t.id,
    section: t.section,
    number: t.number,
    title: t.title,
    minutes: t.minutes,
    isPublished: t.isPublished,
    questionCount: perTest.get(t.id) ?? 0,
    best: best.get(t.id) ?? null,
  }));
};

/**
 * The finished paper with the key revealed: every question, which option was
 * right, what the learner picked, and why.
 *
 * Guarded on status — releasing this while the attempt is still open would
 * hand over the answer key mid-exam.
 */
export const getReview = async (userId: string, attemptId: string) => {
  const attempt = await prisma.jlptAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: { select: { questionId: true, chosen: true, isCorrect: true } } },
  });
  if (!attempt) throw createError('Urinish topilmadi', 404);
  if (attempt.status !== JlptAttemptStatus.COMPLETED) {
    throw createError('Imtihon hali tugallanmagan', 409);
  }

  const testIds = attempt.testId
    ? [attempt.testId]
    : (
        await prisma.jlptTest.findMany({
          where: { setId: attempt.setId! },
          select: { id: true },
        })
      ).map((t) => t.id);

  const groups = await prisma.jlptQuestionGroup.findMany({
    where: { testId: { in: testIds } },
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      type: true,
      instruction: true,
      instructionUz: true,
      passage: true,
      test: { select: { section: true } },
      questions: {
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          stem: true,
          focus: true,
          transcript: true,
          explanationUz: true,
          choices: {
            orderBy: { number: 'asc' },
            select: { id: true, number: true, text: true, isCorrect: true },
          },
        },
      },
    },
  });

  const picked = new Map(attempt.answers.map((a) => [a.questionId, a]));

  return {
    attempt: {
      id: attempt.id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      finishedAt: attempt.finishedAt,
    },
    groups: groups.map((g) => ({
      ...g,
      section: g.test.section,
      questions: g.questions.map((q) => ({
        ...q,
        chosen: picked.get(q.id)?.chosen ?? null,
        isCorrect: picked.get(q.id)?.isCorrect ?? false,
      })),
    })),
  };
};

/** Full exam sets of a level. */
export const listSets = async (level: JlptLevel, includeDrafts = false) =>
  prisma.jlptExamSet.findMany({
    where: { level, ...(includeDrafts ? {} : { isPublished: true }) },
    orderBy: { sortOrder: 'asc' },
    include: {
      tests: {
        orderBy: { section: 'asc' },
        select: { id: true, section: true, minutes: true, number: true },
      },
    },
  });

// ─── Paper delivery ───────────────────────────────────────────────────────────

/**
 * The paper as the learner sees it: groups, questions and choices — but never
 * `isCorrect`. Marking happens server-side, so the answer key is not shipped
 * to the browser where anyone could read it out of the network tab.
 */
const paperSelect = {
  id: true,
  number: true,
  type: true,
  instruction: true,
  instructionUz: true,
  passage: true,
  imageUrl: true,
  audioUrl: true,
  questions: {
    orderBy: { number: 'asc' as const },
    select: {
      id: true,
      number: true,
      stem: true,
      focus: true,
      imageUrl: true,
      audioUrl: true,
      transcript: true,
      points: true,
      choices: {
        orderBy: { number: 'asc' as const },
        select: { id: true, number: true, text: true },
      },
    },
  },
} satisfies Prisma.JlptQuestionGroupSelect;

/**
 * Test metadata without the questions — what the briefing screen needs.
 *
 * Kept separate from getPaper on purpose: showing someone the cover page
 * should not hand them the paper, and this route is not premium-gated.
 */
export const getTestInfo = async (testId: string, userId?: string) => {
  const test = await prisma.jlptTest.findUnique({
    where: { id: testId },
    select: {
      id: true,
      level: true,
      section: true,
      number: true,
      title: true,
      minutes: true,
      isPublished: true,
      groups: { select: { _count: { select: { questions: true } } } },
    },
  });
  if (!test) throw createError('Test topilmadi', 404);

  const questionCount = test.groups.reduce((n, g) => n + g._count.questions, 0);

  let best: { score: number; maxScore: number } | null = null;
  if (userId) {
    const done = await prisma.jlptAttempt.findFirst({
      where: { userId, testId, status: JlptAttemptStatus.COMPLETED },
      orderBy: { score: 'desc' },
      select: { score: true, maxScore: true },
    });
    if (done?.score !== null && done?.maxScore !== null && done) {
      best = { score: done.score!, maxScore: done.maxScore! };
    }
  }

  const { groups, ...rest } = test;
  return { ...rest, questionCount, best };
};

/** Sections run in the order the real paper prints them. */
const SECTION_ORDER: JlptSection[] = [
  JlptSection.MOJI_GOI,
  JlptSection.BUNPOU,
  JlptSection.DOKKAI,
  JlptSection.CHOUKAI,
];

const bySectionOrder = <T extends { section: JlptSection }>(a: T, b: T) =>
  SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);

/** The cover page for a full exam: its four parts, timings and totals. */
export const getSetInfo = async (setId: string, userId?: string) => {
  const set = await prisma.jlptExamSet.findUnique({
    where: { id: setId },
    include: {
      tests: {
        select: {
          id: true,
          section: true,
          number: true,
          title: true,
          minutes: true,
          groups: { select: { _count: { select: { questions: true } } } },
        },
      },
    },
  });
  if (!set) throw createError('Imtihon topilmadi', 404);

  const tests = set.tests
    .map((t) => {
      const { groups, ...rest } = t;
      return {
        ...rest,
        questionCount: groups.reduce((n, g) => n + g._count.questions, 0),
      };
    })
    .sort(bySectionOrder);

  let best: { score: number; maxScore: number } | null = null;
  if (userId) {
    const done = await prisma.jlptAttempt.findFirst({
      where: { userId, setId, status: JlptAttemptStatus.COMPLETED },
      orderBy: { score: 'desc' },
      select: { score: true, maxScore: true },
    });
    if (done && done.score !== null && done.maxScore !== null) {
      best = { score: done.score, maxScore: done.maxScore };
    }
  }

  return {
    id: set.id,
    level: set.level,
    title: set.title,
    description: set.description,
    isPublished: set.isPublished,
    tests,
    totalMinutes: tests.reduce((n, t) => n + t.minutes, 0),
    totalQuestions: tests.reduce((n, t) => n + t.questionCount, 0),
    best,
  };
};

/**
 * The whole exam as one paper: every section's groups, in exam order.
 *
 * Delivered in a single call rather than four so the runner never has to pause
 * between parts to fetch — a stall mid-exam would be eating the learner's clock.
 */
export const getSetPaper = async (setId: string) => {
  const set = await prisma.jlptExamSet.findUnique({
    where: { id: setId },
    include: {
      tests: {
        select: {
          id: true,
          section: true,
          minutes: true,
          title: true,
          groups: { orderBy: { number: 'asc' }, select: paperSelect },
        },
      },
    },
  });
  if (!set) throw createError('Imtihon topilmadi', 404);

  return {
    id: set.id,
    level: set.level,
    title: set.title,
    isPublished: set.isPublished,
    minutes: set.tests.reduce((n, t) => n + t.minutes, 0),
    tests: set.tests.sort(bySectionOrder),
  };
};

export const getPaper = async (testId: string) => {
  const test = await prisma.jlptTest.findUnique({
    where: { id: testId },
    include: { groups: { orderBy: { number: 'asc' }, select: paperSelect } },
  });
  if (!test) throw createError('Test topilmadi', 404);
  return test;
};

// ─── Attempts ─────────────────────────────────────────────────────────────────

/** How long an attempt gets: one test's minutes, or the sum across a set. */
const minutesFor = async (testId?: string, setId?: string) => {
  if (testId) {
    const t = await prisma.jlptTest.findUnique({
      where: { id: testId },
      select: { minutes: true },
    });
    if (!t) throw createError('Test topilmadi', 404);
    return t.minutes;
  }
  const tests = await prisma.jlptTest.findMany({
    where: { setId },
    select: { minutes: true },
  });
  if (!tests.length) throw createError('Imtihon toʻplami boʻsh', 404);
  return tests.reduce((sum, t) => sum + t.minutes, 0);
};

/**
 * Start an attempt, or hand back the one already running.
 *
 * Re-entering deliberately does NOT restart the clock: the existing row is
 * returned with whatever time is left on it. An attempt whose time ran out
 * while the learner was away is closed and scored on the spot.
 */
export const startAttempt = async (
  userId: string,
  target: { testId?: string; setId?: string },
) => {
  if (!target.testId === !target.setId) {
    throw createError('Test yoki imtihon toʻplamidan bittasi kerak', 400);
  }

  const existing = await prisma.jlptAttempt.findFirst({
    where: { userId, status: JlptAttemptStatus.IN_PROGRESS, ...target },
  });

  if (existing) {
    const minutes = await minutesFor(target.testId, target.setId);
    if (timingFor({ startedAt: existing.startedAt, minutes }).expired) {
      return { attempt: await finishAttempt(userId, existing.id), resumed: false };
    }
    return { attempt: existing, minutes, resumed: true };
  }

  const minutes = await minutesFor(target.testId, target.setId);
  const attempt = await prisma.jlptAttempt.create({
    data: { userId, ...target },
  });
  return { attempt, minutes, resumed: false };
};

/**
 * Record answers.
 *
 * The client batches these every few seconds rather than firing one request
 * per tap — at a thousand concurrent sitters that is the difference between a
 * trickle of writes and a flood. Answers arriving after the deadline are
 * ignored rather than rejected: the attempt is over, and erroring would only
 * lose the answers that did land in time.
 */
export const saveAnswers = async (
  userId: string,
  attemptId: string,
  answers: { questionId: string; chosen: number | null }[],
) => {
  const attempt = await prisma.jlptAttempt.findFirst({
    where: { id: attemptId, userId },
  });
  if (!attempt) throw createError('Urinish topilmadi', 404);
  if (attempt.status !== JlptAttemptStatus.IN_PROGRESS) {
    return { saved: 0, expired: true };
  }

  const minutes = await minutesFor(attempt.testId ?? undefined, attempt.setId ?? undefined);
  if (timingFor({ startedAt: attempt.startedAt, minutes }).expired) {
    return { saved: 0, expired: true };
  }

  // Marking happens here, not at submit time, so the final tally is a sum
  // rather than a re-read of every question.
  const questions = await prisma.jlptQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) } },
    select: { id: true, choices: { select: { number: true, isCorrect: true } } },
  });
  const keyed = new Map(questions.map((q) => [q.id, q]));

  await prisma.$transaction(
    answers
      .filter((a) => keyed.has(a.questionId))
      .map((a) => {
        const correct = keyed
          .get(a.questionId)!
          .choices.find((c) => c.isCorrect)?.number;
        const isCorrect = a.chosen === null ? false : a.chosen === correct;
        return prisma.jlptAttemptAnswer.upsert({
          where: {
            attemptId_questionId: { attemptId, questionId: a.questionId },
          },
          create: { attemptId, questionId: a.questionId, chosen: a.chosen, isCorrect },
          update: { chosen: a.chosen, isCorrect },
        });
      }),
  );

  return { saved: answers.length, expired: false };
};

/**
 * Close an attempt and score it.
 *
 * The real JLPT scales scores with item response theory, which cannot be
 * reproduced from outside. This reports the raw tally and the per-section
 * split, and the UI labels it as approximate — see the pass rule below, which
 * is the part that can be modelled honestly.
 */
export const finishAttempt = async (userId: string, attemptId: string) => {
  const attempt = await prisma.jlptAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: true },
  });
  if (!attempt) throw createError('Urinish topilmadi', 404);
  if (attempt.status !== JlptAttemptStatus.IN_PROGRESS) return attempt;

  const testIds = attempt.testId
    ? [attempt.testId]
    : (
        await prisma.jlptTest.findMany({
          where: { setId: attempt.setId! },
          select: { id: true },
        })
      ).map((t) => t.id);

  const groups = await prisma.jlptQuestionGroup.findMany({
    where: { testId: { in: testIds } },
    select: {
      test: { select: { section: true } },
      questions: { select: { id: true, points: true } },
    },
  });

  const answerFor = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const bySection: Record<string, { score: number; max: number }> = {};
  let score = 0;
  let maxScore = 0;

  for (const g of groups) {
    const section = g.test.section;
    bySection[section] ??= { score: 0, max: 0 };
    for (const q of g.questions) {
      maxScore += q.points;
      bySection[section].max += q.points;
      if (answerFor.get(q.id)?.isCorrect) {
        score += q.points;
        bySection[section].score += q.points;
      }
    }
  }

  return prisma.jlptAttempt.update({
    where: { id: attemptId },
    data: {
      status: JlptAttemptStatus.COMPLETED,
      finishedAt: new Date(),
      score,
      maxScore,
      sectionScores: bySection,
      passed: isPass(score, maxScore, bySection),
    },
  });
};

/**
 * The JLPT pass rule, as far as it can be honestly modelled: a total
 * threshold AND a floor in every section. Scoring high on vocabulary while
 * skipping listening is a fail on the real test, and it is a fail here.
 *
 * The official totals are out of 180 with level-specific pass marks (N5 80,
 * N4 90, N3 95, N2 90, N1 100) — all close to 45–55%. The section floor is
 * 19/60, about 32%. Both are applied here as percentages of whatever the mock
 * paper is worth.
 */
const PASS_RATIO = 0.45;
const SECTION_FLOOR_RATIO = 0.32;

const isPass = (
  score: number,
  maxScore: number,
  bySection: Record<string, { score: number; max: number }>,
) => {
  if (maxScore === 0) return false;
  if (score / maxScore < PASS_RATIO) return false;
  return Object.values(bySection).every(
    (s) => s.max === 0 || s.score / s.max >= SECTION_FLOOR_RATIO,
  );
};

/** An attempt with its remaining time, for resuming after a reload. */
export const getAttempt = async (userId: string, attemptId: string) => {
  const attempt = await prisma.jlptAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: { select: { questionId: true, chosen: true } } },
  });
  if (!attempt) throw createError('Urinish topilmadi', 404);

  const minutes = await minutesFor(
    attempt.testId ?? undefined,
    attempt.setId ?? undefined,
  );
  return { attempt, timing: timingFor({ startedAt: attempt.startedAt, minutes }) };
};

export const SECTIONS: JlptSection[] = [
  JlptSection.MOJI_GOI,
  JlptSection.BUNPOU,
  JlptSection.DOKKAI,
  JlptSection.CHOUKAI,
];
