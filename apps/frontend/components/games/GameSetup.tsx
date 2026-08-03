'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Tag, Play, ChevronDown, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Book, Topic, GameType, GameSession } from '@/lib/types';

const GAME_LABELS: Record<GameType, { label: string; icon: string; desc: string }> = {
  TEST:    { label: 'Test',            icon: '🧠', desc: "4 ta variantdan to'g'ri ma'noni tanlang" },
  MATCH:   { label: 'Juftlik moslash', icon: '🔗', desc: "Yaponcha so'zlarni ma'nosiga moslang" },
  WRITE:   { label: 'Yozish mashqi',   icon: '⌨️',  desc: "O'zbekcha ma'nosidan yaponchasini yozing (kanji, hiragana yoki katakana)" },
  SHOOTER: { label: 'Space Shooter',   icon: '🚀', desc: "To'g'ri asteroidni bosing!" },
};

const DEFAULT_DIFFICULTY_OPTIONS = [
  { value: 5, label: 'Oson', desc: '5 ta savol' },
  { value: 10, label: 'O\'rtacha', desc: '10 ta savol' },
  { value: 15, label: 'Qiyin', desc: '15 ta savol' },
  { value: 20, label: 'Samuray', desc: '20 ta savol' },
];

const MATCH_DIFFICULTY_OPTIONS = [
  { value: 20, label: 'Oson', desc: '2 ta raund' },
  { value: 50, label: 'O\'rtacha', desc: '5 ta raund' },
  { value: 100, label: 'Qiyin', desc: '10 ta raund' },
  { value: 200, label: 'Samuray', desc: '20 ta raund' },
];

interface GameSetupProps {
  gameType:   GameType;
  isLoading:  boolean;
  error:      string | null;
  /** Pre-checks "SRS review only" — used by the dashboard's review button. */
  defaultDueOnly?: boolean;
  onStart:    (opts: { gameType: GameType; topicId?: string; bookId?: string; limit: number; dueOnly: boolean }) => void;
}

export function GameSetup({ gameType, isLoading, error, defaultDueOnly = false, onStart }: GameSetupProps) {
  const [books,    setBooks]    = useState<Book[]>([]);
  const [topics,   setTopics]   = useState<Topic[]>([]);
  const [bookId,   setBookId]   = useState('');
  const [topicId,  setTopicId]  = useState('');
  const [limit,    setLimit]    = useState(gameType === 'MATCH' ? 200 : 20);
  const [dueOnly,  setDueOnly]  = useState(defaultDueOnly);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load books
  useEffect(() => {
    api.get<{ data: Book[] }>('/books', { params: { limit: 100 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => {});
  }, []);

  // Load topics when book changes
  useEffect(() => {
    setTopicId('');
    if (!bookId) {
      api.get<Topic[]>('/topics').then(({ data }) => setTopics(data)).catch(() => {});
      return;
    }
    api.get<Topic[]>(`/books/${bookId}/topics`).then(({ data }) => setTopics(data)).catch(() => {});
  }, [bookId]);

  const game = GAME_LABELS[gameType];
  const isMatchGame = gameType === 'MATCH';
  const difficultyOptions = isMatchGame ? MATCH_DIFFICULTY_OPTIONS : DEFAULT_DIFFICULTY_OPTIONS;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Game type badge */}
      <div className="text-center mb-8">
        <span className="text-5xl mb-3 block">{game.icon}</span>
        <h2 className="text-2xl font-extrabold text-text-primary">{game.label}</h2>
        <p className="text-text-muted mt-1">{game.desc}</p>
      </div>

      <div className="card-glass p-6 space-y-5">
        {/* Difficulty Level (Sets the questions/words count) */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
            <Zap size={14} className="text-primary" /> Qiyinchilik darajasi
          </label>
          <div className="grid grid-cols-4 gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLimit(opt.value)}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-xl text-center border transition-all duration-200',
                  limit === opt.value
                    ? 'bg-primary/20 border-primary text-primary shadow-glow-sm scale-[1.02]'
                    : 'bg-surface/30 border-border/60 text-text-muted hover:border-primary/40 hover:text-text-secondary',
                )}
              >
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[9px] opacity-70 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Due only toggle */}
        <label className="flex items-center justify-between cursor-pointer group py-2">
          <div>
            <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
              Faqat takrorlash kerak bo'lganlar
            </p>
            <p className="text-xs text-text-muted">Faqat bugun takrorlanishi kerak bo'lgan so'zlarni ko'rsatish</p>
          </div>
          <div
            onClick={() => setDueOnly((v) => !v)}
            className={cn(
              'w-11 h-6 rounded-full border-2 transition-all relative',
              dueOnly ? 'bg-primary border-primary' : 'bg-surface-2 border-border',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
              dueOnly ? 'left-5' : 'left-0.5',
            )} />
          </div>
        </label>

        {/* Advanced Filters Button */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors border border-border/50 rounded-full px-3 py-1.5 bg-surface-2/40"
          >
            <span>⚙️ Qo'shimcha filtrlar (Kitob/Mavzu/Savollar)</span>
            {(bookId || topicId || (limit !== (isMatchGame ? 200 : 20) && !difficultyOptions.some((o) => o.value === limit))) && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => onStart({ gameType, bookId: bookId || undefined, topicId: topicId || undefined, limit, dueOnly })}
          disabled={isLoading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
        >
          {isLoading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Yaratilmoqda…</>
            : <><Play size={18} /> O'yinni boshlash</>
          }
        </button>
      </div>

      {/* Modal / Popup for Book, Topic & Custom question count */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card-glass w-full max-w-md p-6 space-y-5 animate-scale-in relative border border-border">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-lg"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-bold text-text-primary">Qo'shimcha filtrlar</h3>
              <p className="text-xs text-text-muted mt-0.5">O'yin so'zlarini kitob, mavzu yoki soni bo'yicha cheklang.</p>
            </div>

            {/* Book picker */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <BookOpen size={14} /> Kitobni tanlash
              </label>
              <div className="relative">
                <select
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="input-field pr-8 appearance-none cursor-pointer bg-surface/80"
                >
                  <option value="">Barcha kitoblar</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Topic picker */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <Tag size={14} /> Mavzuni tanlash
              </label>
              <div className="relative">
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="input-field pr-8 appearance-none cursor-pointer bg-surface/80"
                >
                  <option value="">Barcha mavzular</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Custom Limit Input */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <Zap size={14} className="text-primary" /> {isMatchGame ? "So'zlar soni (kiritish)" : "Savollar soni (kiritish)"}
              </label>
              <input
                type="number"
                min="1"
                max={isMatchGame ? 200 : 50}
                value={limit}
                onChange={(e) => setLimit(Math.min(isMatchGame ? 200 : 50, Math.max(1, parseInt(e.target.value) || (isMatchGame ? 200 : 20))))}
                className="input-field bg-surface/80"
                placeholder={isMatchGame ? "So'zlar sonini kiriting (1-200)" : "Savollar sonini kiriting (1-50)"}
              />
              <p className="text-[10px] text-text-muted">
                {isMatchGame ? "Maxsus so'zlar sonini kiriting (1 dan 200 gacha)." : "Maxsus savollar sonini kiriting (1 dan 50 gacha)."}
              </p>
            </div>

            {/* Reset & Apply */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setBookId('');
                  setTopicId('');
                  setLimit(isMatchGame ? 200 : 20);
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border text-text-muted hover:bg-surface-2 transition-all"
              >
                Filtrlarni o'chirish
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-all"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
