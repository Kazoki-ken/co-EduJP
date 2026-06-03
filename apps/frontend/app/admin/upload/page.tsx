'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, CheckCircle, XCircle,
  AlertTriangle, ChevronDown, BookOpen,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Book } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadResult {
  message:  string;
  created:  number;
  skipped:  number;
  errors:   { row: number; message: string }[];
}



// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({
  file, onFile, accept,
}: { file: File | null; onFile: (f: File) => void; accept: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : file
            ? 'border-success/60 bg-success/5'
            : 'border-border hover:border-primary/60 hover:bg-surface-2/40',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-3">
          <FileSpreadsheet size={40} className="text-success" />
          <div>
            <p className="font-semibold text-text-primary">{file.name}</p>
            <p className="text-sm text-text-muted mt-0.5">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <span className="text-xs text-success bg-success/10 px-3 py-1 rounded-full border border-success/30">
            {"✓ Yuklashga tayyor"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload size={36} className="text-text-muted" />
          <div>
            <p className="font-semibold text-text-secondary">
              {"Faylni bu yerga tashlang yoki tanlash uchun "} <span className="text-primary">{"bosing"}</span>
            </p>
            <p className="text-xs text-text-muted mt-1">{"CSV, XLS, XLSX — maksimal 10 MB"}</p>
          </div>
          <div className="text-xs text-text-muted border border-border rounded-lg px-3 py-2 font-mono text-left bg-surface-2/50">
            {"Majburiy ustunlar:"}<br />
            <span className="text-primary">japanese_word</span>,{' '}
            <span className="text-primary">meaning</span>,{' '}
            hiragana, example_sentence, example_translation
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Display ───────────────────────────────────────────────────────────

function UploadResultPanel({ result }: { result: UploadResult }) {
  const [showErrors, setShowErrors] = useState(false);
  const total = result.created + result.skipped + result.errors.length;

  const createdPct = total > 0 ? (result.created / total) * 100 : 0;
  const skippedPct = total > 0 ? (result.skipped / total) * 100 : 0;
  const errorPct   = total > 0 ? (result.errors.length / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          result.errors.length > 0 && result.created === 0
            ? 'bg-danger/20' : result.errors.length > 0
            ? 'bg-accent/20' : 'bg-success/20',
        )}>
          {result.errors.length > 0 && result.created === 0
            ? <XCircle size={20} className="text-danger" />
            : result.errors.length > 0
            ? <AlertTriangle size={20} className="text-accent" />
            : <CheckCircle size={20} className="text-success" />
          }
        </div>
        <div>
          <p className="font-semibold text-text-primary">{"Yuklash yakunlandi — HTTP 207"}</p>
          <p className="text-sm text-text-muted">{result.message}</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-success">{result.created}</p>
          <p className="text-xs text-text-muted mt-1">{"Yaratildi"}</p>
        </div>
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-accent">{result.skipped}</p>
          <p className="text-xs text-text-muted mt-1">{"O'tkazib yuborildi"}</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-danger">{result.errors.length}</p>
          <p className="text-xs text-text-muted mt-1">{"Xatolar"}</p>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="h-3 rounded-full overflow-hidden flex">
        <motion.div initial={{ width: 0 }} animate={{ width: `${createdPct}%` }} transition={{ duration: 0.6 }} className="bg-success h-full" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${skippedPct}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-accent h-full" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${errorPct}%` }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-danger h-full" />
      </div>
      <div className="flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> {"Yaratilgan "}{createdPct.toFixed(0)}%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> {"O'tkazib yuborilgan "}{skippedPct.toFixed(0)}%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> {"Xatolar "}{errorPct.toFixed(0)}%</span>
      </div>

      {/* Error list */}
      {result.errors.length > 0 && (
        <div>
          <button
            onClick={() => setShowErrors((v) => !v)}
            className="flex items-center gap-2 text-sm text-danger hover:text-danger/80 transition-colors"
          >
            <ChevronDown size={14} className={cn('transition-transform', showErrors && 'rotate-180')} />
            {showErrors ? 'Yashirish' : 'Ko\'rsatish'} {result.errors.length} {"ta xato"}
          </button>

          <AnimatePresence>
            {showErrors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 bg-danger/5 border border-danger/20 rounded-xl p-3">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <XCircle size={12} className="text-danger shrink-0 mt-0.5" />
                      <span className="text-text-muted">{"Qator "}{e.row}: {e.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ─── Upload Page ──────────────────────────────────────────────────────────────

export default function AdminUploadPage() {
  const [file,      setFile]      = useState<File | null>(null);
  const [books,     setBooks]     = useState<Book[]>([]);
  const [bookId,    setBookId]    = useState('');
  const [topicName, setTopicName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [result,    setResult]    = useState<UploadResult | null>(null);

  useEffect(() => {
    api.get<{ data: Book[] }>('/books', { params: { limit: 500 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => {});
  }, []);

  const reset = () => {
    setFile(null); setError(null); setResult(null);
    setBookId(''); setTopicName('');
  };

  const handleCreateBook = async () => {
    const title = window.prompt('Yangi kitob nomini kiriting:');
    if (!title?.trim()) return;
    try {
      const { data } = await api.post<Book>('/books', { title: title.trim() });
      setBooks((prev) => [...prev, data]);
      setBookId(data.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert("Kitob yaratib bo'lmadi. " + (msg || ''));
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Iltimos, avval faylni tanlang.'); return; }
    if (!bookId || !topicName.trim()) {
      setError('Iltimos, kitobni tanlang va mavzu nomini kiriting.'); return;
    }

    setIsLoading(true); setError(null); setResult(null);

    const form = new FormData();
    form.append('file', file);
    form.append('bookId', bookId);
    form.append('topicName', topicName.trim());

    try {
      const endpoint = '/admin/upload/book-words';
      const { data }  = await api.post<UploadResult>(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: (s) => s < 500,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Yuklash muvaffaqiyatsiz tugadi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-1">{"Ommaviy yuklash"}</h1>
        <p className="text-text-muted text-sm">{"Kitob so'zlarini import qilish uchun CSV yoki Excel fayllarini yuklang."}</p>
      </div>

      <div className="card-glass p-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
              <BookOpen size={13} /> {"Maqsadli kitob"}
            </label>
            <button
              type="button"
              onClick={handleCreateBook}
              className="text-xs text-primary hover:underline"
            >
              {"+ Yangi kitob yaratish"}
            </button>
          </div>
          <div className="relative">
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer text-sm"
            >
              <option value="">{"Kitobni tanlang…"}</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{"Mavzu nomi"}</label>
          <input
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Masalan: Hayvonlar, Taomlar, Salomlashish…"
            className="input-field text-sm"
          />
          <p className="text-xs text-text-muted">{"Agar ushbu mavzu mavjud bo'lmasa, u yangidan yaratiladi."}</p>
        </div>
      </div>

      {/* ── Drop Zone ────────────────────────────────────────────── */}
      <DropZone
        file={file}
        onFile={(f) => { setFile(f); setResult(null); setError(null); }}
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      />

      {/* ── Clear button ─────────────────────────────────────────── */}
      {file && (
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors">
          <X size={12} /> {"Faylni o'chirish"}
        </button>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          <XCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* ── Upload Button ────────────────────────────────────────── */}
      <button
        onClick={handleUpload}
        disabled={!file || isLoading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
      >
        {isLoading
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {"Yuklanmoqda…"}</>
          : <><Upload size={15} /> {"Yuklash va Import"}</>
        }
      </button>

      {/* ── Result Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {result && <UploadResultPanel result={result} />}
      </AnimatePresence>
    </div>
  );
}
