'use client';

/**
 * The question editor for one test.
 *
 * A paper is もんだい groups, each holding questions, so the screen is built
 * the same way: add a group, then add questions inside it. Which fields a
 * question shows depends on the group's type — a listening item needs audio
 * and a script, a kanji-reading item needs the underlined word, and showing
 * every field to everyone would bury the two that matter.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Question types, grouped by the section they belong to ───────────────────

const TYPES: { id: string; label: string; hint: string; sections: string[] }[] = [
  { id: 'KANJI_READING', label: 'Kanji oʻqilishi (漢字読み)', hint: 'Gapda kanji, javoblar hiragana', sections: ['MOJI_GOI'] },
  { id: 'KANJI_WRITING', label: 'Kanji yozilishi (表記)', hint: 'Gapda hiragana, javoblar kanji', sections: ['MOJI_GOI'] },
  { id: 'CONTEXT_FILL', label: 'Mos soʻzni qoʻyish (文脈規定)', hint: 'Gapda （　） boʻlsin', sections: ['MOJI_GOI'] },
  { id: 'PARAPHRASE', label: 'Maʼnodosh gap (言い換え類義)', hint: 'Javoblar — toʻliq gaplar', sections: ['MOJI_GOI'] },
  { id: 'USAGE', label: 'Soʻzning ishlatilishi (用法)', hint: 'Javoblar — toʻliq gaplar', sections: ['MOJI_GOI'] },
  { id: 'GRAMMAR_FILL', label: 'Grammatik shakl (文の文法1)', hint: 'Gapda （　） boʻlsin', sections: ['BUNPOU'] },
  { id: 'SENTENCE_ORDER', label: 'Gap tuzish ★ (文の文法2)', hint: 'Gapda ＿＿ va ★ belgilarini qoʻying', sections: ['BUNPOU'] },
  { id: 'CLOZE_PASSAGE', label: 'Matn ichida boʻshliq (文章の文法)', hint: 'Umumiy matnga 【22】 kabi belgilar qoʻying', sections: ['BUNPOU'] },
  { id: 'READING_SHORT', label: 'Qisqa matn (短文)', hint: 'Umumiy matn yoki rasm kerak', sections: ['DOKKAI'] },
  { id: 'READING_MID', label: 'Oʻrta matn (中文)', hint: 'Umumiy matn kerak', sections: ['DOKKAI'] },
  { id: 'READING_LONG', label: 'Uzun matn (長文)', hint: 'Umumiy matn kerak', sections: ['DOKKAI'] },
  { id: 'INFO_SEARCH', label: 'Maʼlumot izlash (情報検索)', hint: 'Jadval yoki eʼlon — matn yoki rasm', sections: ['DOKKAI'] },
  { id: 'LISTEN_TASK', label: 'Vazifani tushunish (課題理解)', hint: 'Har savolga audio va skript', sections: ['CHOUKAI'] },
  { id: 'LISTEN_POINT', label: 'Muhim nuqta (ポイント理解)', hint: 'Har savolga audio va skript', sections: ['CHOUKAI'] },
  { id: 'LISTEN_SPEECH', label: 'Nutq ifodasi (発話表現)', hint: 'Rasm + audio bilan', sections: ['CHOUKAI'] },
  { id: 'LISTEN_RESPONSE', label: 'Tez javob (即時応答)', hint: 'Qisqa gap, qisqa javoblar', sections: ['CHOUKAI'] },
];

const isListening = (type: string) => type.startsWith('LISTEN_');
const needsFocus = (type: string) => type === 'KANJI_READING' || type === 'KANJI_WRITING';
const groupTakesPassage = (type: string) =>
  type === 'CLOZE_PASSAGE' || type.startsWith('READING_') || type === 'INFO_SEARCH';

// ─── Shapes ───────────────────────────────────────────────────────────────────

interface Choice { id: string; number: number; text: string; isCorrect: boolean }
interface Question {
  id: string; number: number; stem: string; focus: string | null;
  transcript: string | null; imageUrl: string | null; audioUrl: string | null;
  explanationUz: string | null; choices: Choice[];
}
interface Group {
  id: string; number: number; type: string; instruction: string;
  instructionUz: string | null; passage: string | null;
  imageUrl: string | null; audioUrl: string | null; questions: Question[];
}
interface Test {
  id: string; level: string; section: string; number: number;
  title: string | null; minutes: number; isPublished: boolean; groups: Group[];
}

const SECTION_LABEL: Record<string, string> = {
  MOJI_GOI: "Iyerogliflar & So'z",
  BUNPOU: 'Grammatika',
  DOKKAI: "O'qish",
  CHOUKAI: 'Tinglash',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminJlptTestPage({ params }: { params: { testId: string } }) {
  const [test, setTest] = useState<Test | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Test>(`/admin/jlpt/tests/${params.testId}`);
      setTest(data);
      setErr(null);
    } catch (e) {
      setErr(errorMessage(e, 'Testni yuklab boʻlmadi.'));
    }
  }, [params.testId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    if (!test) return;
    setBusy(true);
    try {
      await api.patch(`/admin/jlpt/tests/${test.id}`, { isPublished: !test.isPublished });
      await load();
      setErr(null);
    } catch (e) {
      setErr(errorMessage(e, 'Holatni oʻzgartirib boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  if (err && !test) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-secondary">{err}</p>
        <Link href="/admin/jlpt" className="btn-ghost mt-4 inline-block text-sm">
          Orqaga
        </Link>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={26} className="animate-spin text-primary" />
      </div>
    );
  }

  const questionCount = test.groups.reduce((n, g) => n + g.questions.length, 0);

  return (
    <div className="animate-fade-in">
      <Link
        href="/admin/jlpt"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary
                   transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} /> JLPT bazasi
      </Link>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="card-glass mb-5 flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-text-primary">
            {test.title || `${test.number}-test`}
          </h1>
          <p className="text-sm text-text-muted">
            {test.level} · {SECTION_LABEL[test.section]} · {test.minutes} daq ·{' '}
            {questionCount} ta savol
          </p>
        </div>

        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            test.isPublished ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
          )}
        >
          {test.isPublished ? 'Nashr etilgan' : 'Qoralama'}
        </span>

        <button
          onClick={publish}
          disabled={busy}
          className={cn(
            'py-2 px-4 text-sm',
            test.isPublished ? 'btn-ghost' : 'btn-primary',
          )}
        >
          {test.isPublished ? 'Qoralamaga qaytarish' : 'Nashr qilish'}
        </button>
      </div>

      {err && (
        <div className="mb-4 whitespace-pre-line rounded-xl border border-danger/30 bg-danger/10
                        px-4 py-3 text-sm text-danger">
          {err}
        </div>
      )}

      {/* Excel is offered for every section except listening, where the audio
          cannot travel in a spreadsheet. */}
      {test.section !== 'CHOUKAI' && (
        <ExcelImport testId={test.id} section={test.section} onDone={load} onError={setErr} />
      )}

      {/* ── Groups ────────────────────────────────────────────────────── */}
      <div className="mt-5 space-y-5">
        {test.groups.map((g) => (
          <GroupCard key={g.id} group={g} onChange={load} onError={setErr} />
        ))}
      </div>

      {/* ── Add group ─────────────────────────────────────────────────── */}
      {addingGroup ? (
        <NewGroupForm
          testId={test.id}
          section={test.section}
          onDone={() => {
            setAddingGroup(false);
            void load();
          }}
          onCancel={() => setAddingGroup(false)}
          onError={setErr}
        />
      ) : (
        <button
          onClick={() => setAddingGroup(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed
                     border-border py-4 text-sm font-bold text-text-secondary transition-colors
                     hover:border-primary/50 hover:text-primary"
        >
          <Plus size={16} /> Yangi もんだい qoʻshish
        </button>
      )}
    </div>
  );
}

// ─── Excel import ─────────────────────────────────────────────────────────────

function ExcelImport({
  testId, section, onDone, onError,
}: {
  testId: string;
  section: string;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const send = async (file: File) => {
    setBusy(true);
    setDone(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post<{ groups: number; questions: number }>(
        `/admin/jlpt/tests/${testId}/import`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setDone(`${data.groups} ta もんだい, ${data.questions} ta savol yuklandi`);
      onDone();
    } catch (e) {
      onError(errorMessage(e, 'Faylni yuklab boʻlmadi.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  /** The header row this section's file is expected to have. */
  const columns =
    section === 'DOKKAI'
      ? 'mondai, type, instruction, instruction_uz, passage, stem, choice1..4, answer, explanation'
      : section === 'BUNPOU'
        ? 'mondai, type, instruction, instruction_uz, passage, stem, choice1..4, answer, explanation'
        : 'mondai, type, instruction, instruction_uz, stem, focus, choice1..4, answer, explanation';

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                         bg-success/15 text-success">
          <FileSpreadsheet size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary">Excel orqali yuklash</p>
          <p className="text-xs text-text-muted">
            Har qator — bitta savol. Ustunlar: <span className="font-mono">{columns}</span>
          </p>
        </div>
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          className="btn-ghost flex items-center gap-1.5 py-2 px-3 text-xs disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Fayl tanlash
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && send(e.target.files[0])}
        />
      </div>

      <p className="mt-2 text-[11px] text-warning">
        Diqqat: yuklash testdagi mavjud savollarni almashtiradi.
      </p>

      {done && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
          <Check size={13} /> {done}
        </p>
      )}
    </div>
  );
}

// ─── New group ────────────────────────────────────────────────────────────────

function NewGroupForm({
  testId, section, onDone, onCancel, onError,
}: {
  testId: string;
  section: string;
  onDone: () => void;
  onCancel: () => void;
  onError: (m: string) => void;
}) {
  const available = TYPES.filter((t) => t.sections.includes(section));
  const [type, setType] = useState(available[0]?.id ?? '');
  const [instruction, setInstruction] = useState('');
  const [instructionUz, setInstructionUz] = useState('');
  const [passage, setPassage] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!instruction.trim()) return onError('Yoʻriqnoma boʻsh boʻlmasin.');
    setBusy(true);
    try {
      await api.post(`/admin/jlpt/tests/${testId}/groups`, {
        type,
        instruction: instruction.trim(),
        instructionUz: instructionUz.trim() || undefined,
        passage: passage.trim() || undefined,
      });
      onDone();
    } catch (e) {
      onError(errorMessage(e, 'もんだい qoʻshib boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  const hint = TYPES.find((t) => t.id === type)?.hint;

  return (
    <div className="card-glass mt-5 space-y-3 p-5">
      <h3 className="font-bold text-text-primary">Yangi もんだい</h3>

      <Field label="Savol turi">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
          {available.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </Field>

      <Field label="Yoʻriqnoma (yaponcha)">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="＿＿の ことばは ひらがなで どう かきますか。"
          className="input-field"
        />
      </Field>

      <Field label="Yoʻriqnoma (oʻzbekcha)" optional>
        <input
          value={instructionUz}
          onChange={(e) => setInstructionUz(e.target.value)}
          placeholder="Chizilgan soʻz qanday oʻqiladi?"
          className="input-field"
        />
      </Field>

      {groupTakesPassage(type) && (
        <Field label="Umumiy matn" optional>
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            rows={5}
            placeholder="Oʻqish matni yoki eʼlon. Boʻshliqlar uchun 【22】 kabi belgilar."
            className="input-field font-mono text-sm"
          />
        </Field>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={busy} className="btn-primary py-2 px-4 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Qoʻshish'}
        </button>
        <button onClick={onCancel} className="btn-ghost py-2 px-4 text-sm">Bekor</button>
      </div>
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  group, onChange, onError,
}: {
  group: Group;
  onChange: () => void;
  onError: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const remove = async () => {
    if (!confirm(`${group.number}-もんだい va uning savollari oʻchiriladi. Davom etasizmi?`)) return;
    try {
      await api.delete(`/admin/jlpt/groups/${group.id}`);
      onChange();
    } catch (e) {
      onError(errorMessage(e, 'Oʻchirib boʻlmadi.'));
    }
  };

  const removeQuestion = async (id: string) => {
    if (!confirm('Savol oʻchirilsinmi?')) return;
    try {
      await api.delete(`/admin/jlpt/questions/${id}`);
      onChange();
    } catch (e) {
      onError(errorMessage(e, 'Oʻchirib boʻlmadi.'));
    }
  };

  const typeLabel = TYPES.find((t) => t.id === group.type)?.label ?? group.type;

  return (
    <div className="card-glass p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-primary">もんだい {group.number}</p>
          <p className="text-sm font-bold text-text-primary">{typeLabel}</p>
          <p className="mt-0.5 text-xs text-text-muted">{group.instruction}</p>
        </div>
        <button
          onClick={remove}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          title="もんだい ni oʻchirish"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {group.passage && (
        <pre className="mb-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border
                        bg-surface-2/50 p-3 font-sans text-xs text-text-secondary">
          {group.passage}
        </pre>
      )}

      {/* ── Questions ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {group.questions.map((q) =>
          editing === q.id ? (
            <QuestionForm
              key={q.id}
              groupType={group.type}
              question={q}
              onSave={async (body) => {
                await api.patch(`/admin/jlpt/questions/${q.id}`, body);
                setEditing(null);
                onChange();
              }}
              onCancel={() => setEditing(null)}
              onError={onError}
            />
          ) : (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/30 px-3 py-2.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md
                               bg-primary/15 text-[11px] font-black text-primary">
                {q.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-sm text-text-primary">{q.stem}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {q.choices.map((c) => (
                    <span key={c.id} className={cn(c.isCorrect && 'font-bold text-success')}>
                      {c.number}. {c.text}{'   '}
                    </span>
                  ))}
                </p>
                {q.audioUrl && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
                    <Music size={11} /> audio biriktirilgan
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditing(q.id)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-text-muted
                           transition-colors hover:bg-surface-2 hover:text-primary"
              >
                Tahrir
              </button>
              <button
                onClick={() => removeQuestion(q.id)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <QuestionForm
          groupType={group.type}
          onSave={async (body) => {
            await api.post(`/admin/jlpt/groups/${group.id}/questions`, body);
            setAdding(false);
            onChange();
          }}
          onCancel={() => setAdding(false)}
          onError={onError}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border
                     border-dashed border-border py-2.5 text-xs font-bold text-text-secondary
                     transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus size={14} /> Savol qoʻshish
        </button>
      )}
    </div>
  );
}

// ─── Question form ────────────────────────────────────────────────────────────

interface QuestionBody {
  stem: string;
  focus?: string;
  transcript?: string;
  imageUrl?: string;
  audioUrl?: string;
  explanationUz?: string;
  choices: string[];
  answer: number;
}

function QuestionForm({
  groupType, question, onSave, onCancel, onError,
}: {
  groupType: string;
  question?: Question;
  onSave: (body: QuestionBody) => Promise<void>;
  onCancel: () => void;
  onError: (m: string) => void;
}) {
  const [stem, setStem] = useState(question?.stem ?? '');
  const [focus, setFocus] = useState(question?.focus ?? '');
  const [transcript, setTranscript] = useState(question?.transcript ?? '');
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? '');
  const [audioUrl, setAudioUrl] = useState(question?.audioUrl ?? '');
  const [explanation, setExplanation] = useState(question?.explanationUz ?? '');
  const [choices, setChoices] = useState<string[]>(
    question ? question.choices.map((c) => c.text) : ['', '', '', ''],
  );
  const [answer, setAnswer] = useState(
    question ? (question.choices.find((c) => c.isCorrect)?.number ?? 1) : 1,
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const filled = choices.map((c) => c.trim());
    if (!stem.trim()) return onError('Savol matni boʻsh.');
    if (filled.filter(Boolean).length < 2) return onError('Kamida 2 ta variant kerak.');
    if (!filled[answer - 1]) return onError('Toʻgʻri deb belgilangan variant boʻsh.');

    setBusy(true);
    try {
      await onSave({
        stem: stem.trim(),
        focus: focus.trim() || undefined,
        transcript: transcript.trim() || undefined,
        imageUrl: imageUrl || undefined,
        audioUrl: audioUrl || undefined,
        explanationUz: explanation.trim() || undefined,
        choices: filled.filter(Boolean),
        answer,
      });
    } catch (e) {
      onError(errorMessage(e, 'Saqlab boʻlmadi.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
      <Field label="Savol matni">
        <textarea
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          rows={groupType === 'SENTENCE_ORDER' ? 3 : 2}
          placeholder={
            groupType === 'SENTENCE_ORDER'
              ? 'A「すみません、つぎの ＿＿ ★ ＿＿ ＿＿ まがって ください。」'
              : 'あしたは 雨ですか。'
          }
          className="input-field"
        />
      </Field>

      {needsFocus(groupType) && (
        <Field label="Tagiga chiziladigan soʻz" optional>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="雨"
            className="input-field"
          />
        </Field>
      )}

      {isListening(groupType) && (
        <>
          <Field label="Audio matni (skript)">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              placeholder={'女：すみません、この 本を かりたいんですが。\n男：はい。カードは ありますか。'}
              className="input-field text-sm"
            />
            <p className="mt-1 text-xs text-text-muted">
              Audio fayl boʻlmasa, shu matn sunʼiy yapon ovozi bilan oʻqiladi.
            </p>
          </Field>

          <MediaField
            label="Audio fayl"
            kind="audio"
            value={audioUrl}
            onChange={setAudioUrl}
            onError={onError}
          />
        </>
      )}

      <MediaField
        label="Rasm"
        kind="image"
        value={imageUrl}
        onChange={setImageUrl}
        onError={onError}
        optional
      />

      {/* ── Choices ───────────────────────────────────────────────────── */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-text-secondary">
          Variantlar — toʻgʻrisini belgilang
        </p>
        <div className="space-y-2">
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnswer(i + 1)}
                title="Toʻgʻri javob"
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                  answer === i + 1
                    ? 'border-success bg-success text-white'
                    : 'border-border text-text-muted hover:border-success/50',
                )}
              >
                {answer === i + 1 ? <Check size={14} strokeWidth={3} /> : i + 1}
              </button>
              <input
                value={c}
                onChange={(e) => {
                  const next = [...choices];
                  next[i] = e.target.value;
                  setChoices(next);
                }}
                placeholder={`${i + 1}-variant`}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      <Field label="Oʻzbekcha izoh" optional>
        <input
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="雨 — «ame», yomgʻir."
          className="input-field"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={busy} className="btn-primary py-2 px-4 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Saqlash'}
        </button>
        <button onClick={onCancel} className="btn-ghost py-2 px-4 text-sm">Bekor</button>
      </div>
    </div>
  );
}

// ─── Media upload ─────────────────────────────────────────────────────────────

function MediaField({
  label, kind, value, onChange, onError, optional,
}: {
  label: string;
  kind: 'image' | 'audio';
  value: string;
  onChange: (url: string) => void;
  onError: (m: string) => void;
  optional?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const send = async (file: File) => {
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post<{ url: string }>('/admin/jlpt/media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (e) {
      onError(errorMessage(e, 'Faylni yuklab boʻlmadi.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Field label={label} optional={optional}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="btn-ghost flex items-center gap-1.5 py-2 px-3 text-xs disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : kind === 'image' ? (
            <ImageIcon size={13} />
          ) : (
            <Music size={13} />
          )}
          {value ? 'Almashtirish' : 'Yuklash'}
        </button>

        {value && (
          <>
            <span className="truncate rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-text-secondary">
              {value.split('/').pop()}
            </span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>

      {value && kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 max-h-40 rounded-lg border border-border" />
      )}
      {value && kind === 'audio' && (
        <audio controls src={value} className="mt-2 w-full max-w-sm" />
      )}

      <input
        ref={input}
        type="file"
        accept={kind === 'image' ? 'image/*' : 'audio/*'}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && send(e.target.files[0])}
      />
    </Field>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Field({
  label, optional, children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-text-secondary">
        {label}
        {optional && <span className="ml-1 font-medium text-text-muted">(ixtiyoriy)</span>}
      </label>
      {children}
    </div>
  );
}
