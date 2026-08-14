/**
 * JLPT section metadata — DESIGN PREVIEW DATA.
 *
 * The schema has no exam bank yet (only a `jlptLevel` tag on words), so every
 * test count and score below is illustrative. The timings and question counts
 * follow the published JLPT format closely enough to design against, but they
 * are approximations, not a syllabus — replace this file with API data once
 * the exam models exist.
 */

import { BookOpen, Headphones, PenLine, SpellCheck, type LucideIcon } from 'lucide-react';

export type LevelId = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type SectionId = 'moji' | 'bunpou' | 'dokkai' | 'choukai';

export interface Level {
  id: LevelId;
  label: string;
  /** Roughly how many words the level expects. */
  words: string;
  /** Tailwind gradient stops for level-tinted tiles. */
  accent: string;
}

export const LEVELS: Level[] = [
  { id: 'N5', label: "Boshlang'ich",     words: "~800 so'z",   accent: 'from-emerald-500 to-emerald-700' },
  { id: 'N4', label: 'Elementar',        words: "~1500 so'z",  accent: 'from-sky-500 to-sky-700'         },
  { id: 'N3', label: "O'rta",            words: "~3750 so'z",  accent: 'from-amber-500 to-amber-700'     },
  { id: 'N2', label: "O'rtadan yuqori",  words: "~6000 so'z",  accent: 'from-orange-500 to-red-600'      },
  { id: 'N1', label: 'Yuqori',           words: "~10000 so'z", accent: 'from-violet-500 to-fuchsia-700'  },
];

export interface Section {
  id: SectionId;
  /** Short label for tabs. */
  label: string;
  /** Full title for the detail page header. */
  title: string;
  jp: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Colours as full class names — Tailwind only keeps what it can see. */
  /** Gradient for the detail-page header band. */
  band: string;
  /** Flat gradient for small icon tiles. */
  solid: string;
  /** Tinted surface for stat tiles. */
  tile: string;
  /** Readable accent text in both themes. */
  text: string;
  /** Soft glow on hover. */
  glow: string;
  /** How the section is examined — shown as the "Test formati" list. */
  format: string[];
  /** Per level: minutes, question count and how many mock tests exist. */
  byLevel: Record<LevelId, { minutes: number; questions: number; tests: number }>;
}

export const SECTIONS: Section[] = [
  {
    id: 'moji',
    label: "Iyerogliflar & So'z",
    title: 'Moji · Goi',
    jp: '文字・語彙',
    subtitle: "Kanji o'qilishi, yozilishi va so'z boyligi",
    Icon: SpellCheck,
    band: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700',
    solid: 'bg-gradient-to-br from-emerald-500 to-teal-700',
    tile: 'bg-emerald-500/10 border-emerald-500/25',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'hover:shadow-[0_0_24px_rgba(16,185,129,0.28)]',
    format: [
      "Kanji o'qilishini tanlash (漢字読み)",
      "So'zni kanji bilan yozish (表記)",
      "Kontekstga mos so'zni qo'yish (文脈規定)",
      "Ma'nodosh so'zni topish (言い換え類義)",
      "So'zning to'g'ri ishlatilishi (用法)",
    ],
    byLevel: {
      N5: { minutes: 20, questions: 25, tests: 30 },
      N4: { minutes: 25, questions: 28, tests: 26 },
      N3: { minutes: 30, questions: 32, tests: 22 },
      N2: { minutes: 35, questions: 32, tests: 18 },
      N1: { minutes: 40, questions: 30, tests: 14 },
    },
  },
  {
    id: 'bunpou',
    label: 'Grammatika',
    title: 'Bunpou',
    jp: '文法',
    subtitle: "Grammatik shakllar va gap tuzilishi",
    Icon: PenLine,
    band: 'bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700',
    solid: 'bg-gradient-to-br from-sky-500 to-indigo-700',
    tile: 'bg-sky-500/10 border-sky-500/25',
    text: 'text-sky-600 dark:text-sky-400',
    glow: 'hover:shadow-[0_0_24px_rgba(14,165,233,0.28)]',
    format: [
      "Gapga mos grammatik shaklni tanlash (文の文法1)",
      "So'zlarni to'g'ri tartibda joylash (文の文法2)",
      "Matn ichidagi bo'shliqlarni to'ldirish (文章の文法)",
    ],
    byLevel: {
      N5: { minutes: 20, questions: 20, tests: 24 },
      N4: { minutes: 25, questions: 23, tests: 22 },
      N3: { minutes: 30, questions: 23, tests: 20 },
      N2: { minutes: 35, questions: 22, tests: 16 },
      N1: { minutes: 40, questions: 20, tests: 12 },
    },
  },
  {
    id: 'dokkai',
    label: "O'qish",
    title: 'Dokkai',
    jp: '読解',
    subtitle: "Matnlarni tushunish va savollarga javob berish",
    Icon: BookOpen,
    band: 'bg-gradient-to-br from-rose-500 via-red-600 to-red-800',
    solid: 'bg-gradient-to-br from-rose-500 to-red-700',
    tile: 'bg-rose-500/10 border-rose-500/25',
    text: 'text-rose-600 dark:text-rose-400',
    glow: 'hover:shadow-[0_0_24px_rgba(232,57,41,0.3)]',
    format: [
      "Qisqa matnlar (短文) — kundalik e'lon va xat",
      "O'rta matnlar (中文) — maqola parchalari",
      "Uzun matnlar (長文) — fikr va dalil tahlili",
      "Ma'lumot izlash (情報検索) — jadval va varaqadan topish",
    ],
    byLevel: {
      N5: { minutes: 20, questions: 10, tests: 18 },
      N4: { minutes: 30, questions: 14, tests: 18 },
      N3: { minutes: 40, questions: 18, tests: 16 },
      N2: { minutes: 70, questions: 22, tests: 14 },
      N1: { minutes: 70, questions: 26, tests: 10 },
    },
  },
  {
    id: 'choukai',
    label: 'Tinglash',
    title: 'Choukai',
    jp: '聴解',
    subtitle: "Suhbat va e'lonlarni quloq bilan tushunish",
    Icon: Headphones,
    band: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-700',
    solid: 'bg-gradient-to-br from-amber-400 to-orange-600',
    tile: 'bg-amber-500/10 border-amber-500/25',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'hover:shadow-[0_0_24px_rgba(245,158,11,0.28)]',
    format: [
      "Vazifani tushunish (課題理解) — keyin nima qilish kerak",
      "Muhim nuqtani tushunish (ポイント理解)",
      "Umumiy mazmunni tushunish (概要理解)",
      "Tez javob (即時応答) — qisqa gapga darhol javob",
      "Audio bir marta eshitiladi — haqiqiy imtihondagidek",
    ],
    byLevel: {
      N5: { minutes: 30, questions: 24, tests: 20 },
      N4: { minutes: 35, questions: 28, tests: 18 },
      N3: { minutes: 40, questions: 28, tests: 16 },
      N2: { minutes: 50, questions: 32, tests: 12 },
      N1: { minutes: 60, questions: 36, tests: 10 },
    },
  },
];

export const getSection = (id: string) => SECTIONS.find((s) => s.id === id);
export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);

/** Total minutes for a full mock exam at a level. */
export const fullExamMinutes = (level: LevelId) =>
  SECTIONS.reduce((sum, s) => sum + s.byLevel[level].minutes, 0);

/** Section id → the label shown to learners. Used by the result page. */
export const SECTION_LABELS: Record<string, string> = {
  MOJI_GOI: "Iyerogliflar & So'z",
  BUNPOU: 'Grammatika',
  DOKKAI: "O'qish",
  CHOUKAI: 'Tinglash',
};
