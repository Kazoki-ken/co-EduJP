import api from './api';

/** Shapes the exam runner needs. The answer key never crosses the wire. */

export type JlptSectionId = 'MOJI_GOI' | 'BUNPOU' | 'DOKKAI' | 'CHOUKAI';

export interface JlptChoice {
  id: string;
  number: number;
  text: string;
}

export interface JlptQuestion {
  id: string;
  number: number;
  stem: string;
  focus: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  /** Listening script — spoken aloud, never displayed during the exam. */
  transcript: string | null;
  points: number;
  choices: JlptChoice[];
}

export interface JlptGroup {
  id: string;
  number: number;
  type: string;
  instruction: string;
  instructionUz: string | null;
  passage: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  questions: JlptQuestion[];
}

export interface JlptPaper {
  id: string;
  level: string;
  section: JlptSectionId;
  number: number;
  title: string | null;
  minutes: number;
  groups: JlptGroup[];
}

export interface JlptTiming {
  remainingSeconds: number;
  expired: boolean;
}

export interface JlptAttempt {
  id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  sectionScores: Record<string, { score: number; max: number }> | null;
}

export interface JlptSetPaper {
  id: string;
  level: string;
  title: string;
  minutes: number;
  tests: {
    id: string;
    section: JlptSectionId;
    minutes: number;
    title: string | null;
    groups: JlptGroup[];
  }[];
}

export const fetchSetPaper = (setId: string) =>
  api.get<JlptSetPaper>(`/jlpt/sets/${setId}`).then((r) => r.data);

export const startSetAttempt = (setId: string) =>
  api
    .post<{ attempt: JlptAttempt; resumed: boolean; timing: JlptTiming | null }>(
      '/jlpt/attempts',
      { setId },
    )
    .then((r) => r.data);

export const fetchPaper = (testId: string) =>
  api.get<JlptPaper>(`/jlpt/tests/${testId}`).then((r) => r.data);

export const startAttempt = (testId: string) =>
  api
    .post<{ attempt: JlptAttempt; resumed: boolean; timing: JlptTiming | null }>(
      '/jlpt/attempts',
      { testId },
    )
    .then((r) => r.data);

export const saveAnswers = (
  attemptId: string,
  answers: { questionId: string; chosen: number | null }[],
) =>
  api
    .patch<{ saved: number; expired: boolean }>(
      `/jlpt/attempts/${attemptId}/answers`,
      { answers },
    )
    .then((r) => r.data);

export const finishAttempt = (attemptId: string) =>
  api.post<JlptAttempt>(`/jlpt/attempts/${attemptId}/finish`).then((r) => r.data);

/**
 * Turns a stored media path into one the browser can fetch.
 *
 * Uploads are saved as `/api/jlpt-media/…`, which resolves correctly in
 * production where nginx serves the site and the API from one origin. In
 * development the frontend is on :3000 and the API on :4000, so the path has
 * to be rebased onto the API origin or the image 404s.
 */
export const mediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;

  const base = process.env.NEXT_PUBLIC_API_URL ?? '/api';
  // `base` ends in /api; the stored path starts with /api. Join without
  // doubling it.
  return path.startsWith('/api') ? `${base}${path.slice(4)}` : `${base}${path}`;
};
