'use client';

/**
 * JLPT question bank — the list.
 *
 * Level first, then section, then the tests inside it. That is the same path
 * a learner takes, so an admin looking for "the N4 vocabulary paper" walks the
 * same three steps they would on the site itself.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  PenLine,
  Plus,
  SpellCheck,
  Trash2,
} from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

const SECTIONS = [
  { id: 'MOJI_GOI', label: "Iyerogliflar & So'z", jp: '文字・語彙', Icon: SpellCheck, tint: 'from-emerald-500 to-teal-700' },
  { id: 'BUNPOU',   label: 'Grammatika',          jp: '文法',      Icon: PenLine,    tint: 'from-sky-500 to-indigo-700' },
  { id: 'DOKKAI',   label: "O'qish",              jp: '読解',      Icon: BookOpen,   tint: 'from-rose-500 to-red-700' },
  { id: 'CHOUKAI',  label: 'Tinglash',            jp: '聴解',      Icon: Headphones, tint: 'from-amber-400 to-orange-600' },
] as const;

interface AdminTest {
  id: string;
  number: number;
  title: string | null;
  minutes: number;
  isPublished: boolean;
  groupCount: number;
  questionCount: number;
  updatedAt: string;
}

export default function AdminJlptPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('N5');
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('MOJI_GOI');
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AdminTest[]>('/admin/jlpt/tests', {
        params: { level, section },
      });
      setTests(data);
      setErr(null);
    } catch (e) {
      setErr(errorMessage(e, 'Testlarni yuklab boʻlmadi.'));
    } finally {
      setLoading(false);
    }
  }, [level, section]);

  useEffect(() => {
    void load();
  }, [load]);

  const createTest = async () => {
    setBusy(true);
    try {
      await api.post('/admin/jlpt/tests', { level, section });
      await load();
    } catch (e) {
      setErr(errorMessage(e, 'Test yaratib boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (t: AdminTest) => {
    setBusy(true);
    try {
      await api.patch(`/admin/jlpt/tests/${t.id}`, { isPublished: !t.isPublished });
      await load();
    } catch (e) {
      setErr(errorMessage(e, 'Holatni oʻzgartirib boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  const removeTest = async (t: AdminTest) => {
    if (!confirm(`${t.number}-test va uning barcha savollari oʻchiriladi. Davom etasizmi?`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/jlpt/tests/${t.id}`);
      await load();
    } catch (e) {
      setErr(errorMessage(e, 'Oʻchirib boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  const activeSection = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-primary">JLPT savollar bazasi</h1>
        <p className="text-sm text-text-muted mt-1">
          Darajani va boʻlimni tanlang, keyin test yarating va savollarni kiriting.
        </p>
      </div>

      {/* ── Level ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={cn(
              'rounded-xl border px-5 py-2.5 text-sm font-black transition-all',
              l === level
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-secondary hover:border-primary/40 hover:text-text-primary',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Section ───────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SECTIONS.map((s) => {
          const active = s.id === section;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'relative overflow-hidden rounded-xl border px-3 py-3 text-left transition-all',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-surface-2',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
                  s.tint,
                  active ? 'opacity-100' : 'opacity-40',
                )}
              />
              <s.Icon size={16} className={cn('mb-1.5', active ? 'text-primary' : 'text-text-muted')} />
              <p className={cn('text-sm font-bold', active ? 'text-primary' : 'text-text-primary')}>
                {s.label}
              </p>
              <p className="text-[11px] text-text-muted">{s.jp}</p>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {err}
        </div>
      )}

      {/* ── Tests ─────────────────────────────────────────────────────── */}
      <div className="card-glass p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-text-primary">
            {level} · {activeSection.label}
            <span className="ml-2 text-sm font-medium text-text-muted">
              {tests.length} ta test
            </span>
          </h2>
          <button
            onClick={createTest}
            disabled={busy}
            className="btn-primary flex items-center gap-1.5 py-2 px-4 text-sm disabled:opacity-50"
          >
            <Plus size={15} /> Yangi test
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : tests.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            Bu boʻlimda hali test yoʻq. <br />
            <span className="text-text-secondary">
              &laquo;Yangi test&raquo; tugmasi bilan boshlang.
            </span>
          </p>
        ) : (
          <div className="space-y-2.5">
            {tests.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border
                           bg-surface-2/40 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/jlpt/${t.id}`}
                    className="font-bold text-text-primary hover:text-primary"
                  >
                    {t.title || `${t.number}-test`}
                  </Link>
                  <p className="text-xs text-text-muted">
                    {t.groupCount} ta もんだい · {t.questionCount} ta savol · {t.minutes} daq
                  </p>
                </div>

                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold',
                    t.isPublished
                      ? 'bg-success/15 text-success'
                      : 'bg-warning/15 text-warning',
                  )}
                >
                  {t.isPublished ? 'Nashr etilgan' : 'Qoralama'}
                </span>

                <button
                  onClick={() => togglePublish(t)}
                  disabled={busy}
                  title={t.isPublished ? 'Qoralamaga qaytarish' : 'Nashr qilish'}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2
                             hover:text-text-primary disabled:opacity-50"
                >
                  {t.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>

                <Link
                  href={`/admin/jlpt/${t.id}`}
                  className="btn-ghost py-1.5 px-3 text-xs"
                >
                  Savollar
                </Link>

                <button
                  onClick={() => removeTest(t)}
                  disabled={busy}
                  title="Oʻchirish"
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-danger/10
                             hover:text-danger disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
