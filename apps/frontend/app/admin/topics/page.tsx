'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, BookOpen, Plus, Trash2, ArrowRightLeft,
  Copy, Save, X, PlusCircle, CheckCircle, AlertCircle, Loader2, Search
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Book, Topic, Word } from '@/lib/types';

// ─── Word Form Modal ─────────────────────────────────────────────────────────

interface WordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Word, 'id' | 'createdAt' | 'isSaved' | 'wordTopics'>) => Promise<void>;
  title: string;
}

function WordFormModal({ isOpen, onClose, onSubmit, title }: WordModalProps) {
  const [japaneseWord, setJapaneseWord] = useState('');
  const [hiragana, setHiragana] = useState('');
  const [meaning, setMeaning] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setJapaneseWord('');
    setHiragana('');
    setMeaning('');
    setExampleSentence('');
    setExampleTranslation('');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!japaneseWord.trim() || !hiragana.trim() || !meaning.trim()) {
      setError("Yaponcha so'z, hiragana va ma'nosi kiritilishi shart.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        japaneseWord: japaneseWord.trim(),
        hiragana: hiragana.trim(),
        meaning: meaning.trim(),
        exampleSentence: exampleSentence.trim() || null,
        exampleTranslation: exampleTranslation.trim() || null,
      });
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "So'zni saqlab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="card-glass w-full max-w-md p-6 relative overflow-hidden z-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <PlusCircle size={18} className="text-primary" /> {title}
              </h3>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex gap-2 items-start">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Yaponcha so'z (Kandzi/Kana) *</label>
                <input
                  type="text"
                  value={japaneseWord}
                  onChange={(e) => setJapaneseWord(e.target.value)}
                  placeholder="Masalan, 日本語"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Hiragana / Talaffuz *</label>
                <input
                  type="text"
                  value={hiragana}
                  onChange={(e) => setHiragana(e.target.value)}
                  placeholder="Masalan, にほんご"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Ma'nosi (O'zbekcha) *</label>
                <input
                  type="text"
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Masalan, Yapon tili"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Misol gap (Ixtiyoriy)</label>
                <textarea
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  placeholder="Masalan, 日本語を勉強しています。"
                  className="input-field text-sm h-16 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Misol tarjimasi (Ixtiyoriy)</label>
                <textarea
                  value={exampleTranslation}
                  onChange={(e) => setExampleTranslation(e.target.value)}
                  placeholder="Masalan, Men yapon tilini o'rganyapman."
                  className="input-field text-sm h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2 text-sm">Bekor qilish</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "So'zni saqlash"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Transfer Modal ──────────────────────────────────────────────────────────

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: Word | null;
  books: Book[];
  currentTopicId: string;
  onConfirm: (wordId: string, targetTopicId: string, share: boolean) => Promise<void>;
}

function TransferModal({ isOpen, onClose, word, books, currentTopicId, onConfirm }: TransferModalProps) {
  const [targetBookId, setTargetBookId] = useState('');
  const [targetTopics, setTargetTopics] = useState<Topic[]>([]);
  const [targetTopicId, setTargetTopicId] = useState('');
  const [share, setShare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load topics for selected target book
  useEffect(() => {
    if (!targetBookId) {
      setTargetTopics([]);
      setTargetTopicId('');
      return;
    }
    api.get<Topic[]>(`/topics`, { params: { bookId: targetBookId } })
      .then(({ data }) => setTargetTopics(data))
      .catch(() => setError("Mo'ljaldagi mavzularni yuklab bo'lmadi."));
  }, [targetBookId]);

  const handleTransfer = async () => {
    if (!word || !targetTopicId) {
      setError('Iltimos, maqsadli mavzuni tanlang.');
      return;
    }
    if (targetTopicId === currentTopicId) {
      setError('Ayni bir xil mavzuga ko\'chirib bo\'lmaydi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(word.id, targetTopicId, share);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Ko\'chirish muvaffaqiyatsiz tugadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && word && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="card-glass w-full max-w-md p-6 relative overflow-hidden z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-primary" /> {"So'zni ko'chirish"}
              </h3>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                {"Ko'chirish "} <span className="font-semibold text-text-primary">{word.japaneseWord}</span> {" boshqa mavzuga."}
              </p>

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Select Target Book */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                  <BookOpen size={12} /> {"Maqsadli kitob"}
                </label>
                <select
                  value={targetBookId}
                  onChange={(e) => setTargetBookId(e.target.value)}
                  className="input-field text-sm cursor-pointer"
                >
                  <option value="">{"Kitobni tanlang…"}</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>

              {/* Select Target Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                  <Tag size={12} /> {"Maqsadli mavzu"}
                </label>
                <select
                  value={targetTopicId}
                  onChange={(e) => setTargetTopicId(e.target.value)}
                  className="input-field text-sm cursor-pointer animate-fade-in"
                  disabled={!targetBookId}
                >
                  <option value="">{"Mavzuni tanlang…"}</option>
                  {targetTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Action Mode Selection */}
              <div className="space-y-2 mt-4">
                <label className="text-xs font-semibold text-text-secondary">{"Ko'chirish usuli"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShare(false)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                      !share
                        ? 'bg-primary/20 border-primary text-primary shadow-glow-sm'
                        : 'border-border text-text-muted hover:border-primary/50'
                    )}
                  >
                    <ArrowRightLeft size={16} className="mb-1" />
                    <span className="text-xs font-semibold">{"To'liq ko'chirish"}</span>
                    <span className="text-[10px] opacity-75 mt-0.5">{"Joriy mavzudan o'chiriladi"}</span>
                  </button>

                  <button
                    onClick={() => setShare(true)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                      share
                        ? 'bg-primary/20 border-primary text-primary shadow-glow-sm'
                        : 'border-border text-text-muted hover:border-primary/50'
                    )}
                  >
                    <Copy size={16} className="mb-1" />
                    <span className="text-xs font-semibold">{"Ikkala mavzuda ham ko'rsatish"}</span>
                    <span className="text-[10px] opacity-75 mt-0.5">{"Ikkala mavzuda ham ko'rinadi"}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="btn-ghost flex-1 py-2 text-sm">{"Bekor qilish"}</button>
                <button
                  onClick={handleTransfer}
                  disabled={!targetTopicId || loading}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Ko'chirish"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminTopicsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [words, setWords] = useState<Word[]>([]);
  
  // Search filter
  const [search, setSearch] = useState('');

  // Editing state for renaming topic
  const [renamingName, setRenamingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [transferringWord, setTransferringWord] = useState<Word | null>(null);

  // Status indicators
  const [loadingWords, setLoadingWords] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch all books on mount
  useEffect(() => {
    api.get<{ data: Book[] }>('/books', { params: { limit: 500 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => showToast("Kitoblarni yuklab bo'lmadi.", 'error'));
  }, []);

  // 2. Fetch topics when selected book changes
  useEffect(() => {
    if (!selectedBookId) {
      setTopics([]);
      setSelectedTopicId('');
      setWords([]);
      return;
    }
    api.get<Topic[]>(`/topics`, { params: { bookId: selectedBookId } })
      .then(({ data }) => {
        setTopics(data);
        setSelectedTopicId('');
        setWords([]);
      })
      .catch(() => showToast("Mavzularni yuklab bo'lmadi.", 'error'));
  }, [selectedBookId]);

  // 3. Fetch words in the topic
  const fetchTopicWords = useCallback(() => {
    if (!selectedTopicId) {
      setWords([]);
      return;
    }
    setLoadingWords(true);
    api.get<{ data: Word[] }>('/words', { params: { topicId: selectedTopicId, limit: 500 } })
      .then(({ data }) => setWords(data.data))
      .catch(() => showToast("So'zlarni yuklab bo'lmadi.", 'error'))
      .finally(() => setLoadingWords(false));
  }, [selectedTopicId]);

  useEffect(() => {
    fetchTopicWords();
    const activeTopic = topics.find((t) => t.id === selectedTopicId);
    setRenamingName(activeTopic?.name ?? '');
  }, [selectedTopicId, topics, fetchTopicWords]);

  // Rename Topic handler
  const handleRenameTopic = async () => {
    if (!selectedTopicId || !renamingName.trim()) return;
    const activeTopic = topics.find((t) => t.id === selectedTopicId);
    if (activeTopic?.name === renamingName.trim()) return;

    setIsRenaming(true);
    try {
      await api.put(`/topics/${selectedTopicId}`, { name: renamingName.trim() });
      setTopics((prev) =>
        prev.map((t) => (t.id === selectedTopicId ? { ...t, name: renamingName.trim() } : t))
      );
      showToast("Mavzu nomi muvaffaqiyatli o'zgartirildi!");
    } catch {
      showToast("Mavzu nomini o'zgartirib bo'lmadi.", 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  // Add new word handler
  const handleAddWordSubmit = async (data: Omit<Word, 'id' | 'createdAt' | 'isSaved' | 'wordTopics'>) => {
    if (!selectedTopicId) return;
    await api.post('/words', {
      ...data,
      topicIds: [selectedTopicId],
    });
    showToast("So'z muvaffaqiyatli qo'shildi!");
    fetchTopicWords();
  };

  // Delete word handler
  const handleDeleteWord = async (wordId: string) => {
    const wordToDelete = words.find((w) => w.id === wordId);
    const confirmed = window.confirm(
      `Haqiqatan ham "${wordToDelete?.japaneseWord}" so'zini serverdan o'chirib tashlamoqchimisiz? Bu uni butunlay o'chirib yuboradi.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/words/${wordId}`);
      showToast("So'z serverdan o'chirildi.");
      fetchTopicWords();
    } catch {
      showToast("So'zni o'chirib bo'lmadi.", 'error');
    }
  };

  // Word Transfer confirmation handler
  const handleWordTransferConfirm = async (wordId: string, targetTopicId: string, share: boolean) => {
    const word = words.find((w) => w.id === wordId);
    if (!word) return;

    const currentTopics = word.wordTopics.map((wt) => wt.topic.id);
    let newTopicIds: string[];

    if (share) {
      // Shared presence: Add targetTopicId if not already present
      newTopicIds = Array.from(new Set([...currentTopics, targetTopicId]));
    } else {
      // Move completely: remove currentTopicId and add targetTopicId
      newTopicIds = Array.from(
        new Set([...currentTopics.filter((id) => id !== selectedTopicId), targetTopicId])
      );
    }

    await api.put(`/words/${wordId}`, { topicIds: newTopicIds });
    showToast(share ? "So'z yangi mavzuga ham biriktirildi!" : "So'z yangi mavzuga ko'chirildi!");
    fetchTopicWords();
  };

  // Filter words by search input
  const filteredWords = words.filter((w) => {
    const s = search.toLowerCase();
    return (
      w.japaneseWord.toLowerCase().includes(s) ||
      (w.hiragana && w.hiragana.toLowerCase().includes(s)) ||
      w.meaning.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary mb-1">{"Mavzularni boshqarish"}</h1>
          <p className="text-text-muted text-sm">{"Mavzularni boshqarish, ularning nomini o'zgartirish, ro'yxatlarni tahrirlash va so'zlarni boshqa mavzuga ko'chirish."}</p>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl border text-sm max-w-sm',
              toast.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-danger/10 border-danger/30 text-danger'
            )}
          >
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cascade Selection Dropdowns ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glass p-5 space-y-2">
          <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <BookOpen size={13} /> {"1. Kitobni tanlang"}
          </label>
          <div className="relative">
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="input-field text-sm cursor-pointer pr-8 appearance-none"
            >
              <option value="">{"Kitobni tanlang…"}</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </div>

        <div className="card-glass p-5 space-y-2">
          <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Tag size={13} /> {"2. Mavzuni tanlang"}
          </label>
          <div className="relative">
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="input-field text-sm cursor-pointer pr-8 appearance-none"
              disabled={!selectedBookId}
            >
              <option value="">{"Mavzuni tanlang…"}</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Topic Management Controls & Word List ──────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedTopicId ? (
          <motion.div
            key={selectedTopicId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="space-y-6"
          >
            {/* Control Panel: Rename & Add Word */}
            <div className="card-glass p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-md flex gap-2">
                  <input
                    type="text"
                    value={renamingName}
                    onChange={(e) => setRenamingName(e.target.value)}
                    placeholder="Mavzu nomi…"
                    className="input-field text-sm"
                  />
                  <button
                    onClick={handleRenameTopic}
                    disabled={isRenaming || !renamingName.trim() || renamingName.trim() === topics.find(t => t.id === selectedTopicId)?.name}
                    className="btn-primary px-4 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {isRenaming ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {"Saqlash"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsAddOpen(true)}
                className="btn-primary w-full md:w-auto py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-sm shrink-0"
              >
                <Plus size={14} /> {"So'z qo'shish"}
              </button>
            </div>

            {/* List and Search Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
                  {"So'zlar ro'yxati ("}{filteredWords.length}{" ta so'z)"}
                </h2>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="So'zlarni qidirish..."
                    className="input-field pl-9 pr-4 py-1.5 text-xs"
                  />
                </div>
              </div>

              {loadingWords ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={36} className="text-primary animate-spin" />
                  <p className="text-sm text-text-muted">{"So'zlar yuklanmoqda…"}</p>
                </div>
              ) : filteredWords.length === 0 ? (
                <div className="card-glass p-12 text-center border-dashed">
                  <Tag size={32} className="text-text-muted/40 mx-auto mb-3" />
                  <p className="font-semibold text-text-secondary">{"Hech qanday so'z topilmadi"}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {search ? "Qidiruv filtrini o'zgartirib ko'ring." : "Ushbu mavzuni to'ldirish uchun yangi so'z yarating!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredWords.map((word) => (
                    <motion.div
                      key={word.id}
                      layout
                      className="card-glass p-5 flex flex-col justify-between hover:border-primary/40 transition-all duration-200"
                    >
                      <div className="space-y-2">
                        {/* Word Header */}
                        <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
                          <div>
                            <span className="text-xl font-black text-text-primary tracking-wide">
                              {word.japaneseWord}
                            </span>
                            {word.hiragana && (
                              <span className="text-xs text-text-muted ml-2 font-medium">
                                ({word.hiragana})
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-primary/80 font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            {word.wordTopics[0]?.topic.name ? 'Mavzu' : 'SRS'}
                          </span>
                        </div>

                        {/* Meaning */}
                        <p className="text-sm font-semibold text-text-secondary">{word.meaning}</p>

                        {/* Examples */}
                        {word.exampleSentence && (
                          <div className="text-xs space-y-0.5 bg-surface-2/40 border border-border/40 rounded-lg p-2.5">
                            <p className="font-semibold text-text-primary">{word.exampleSentence}</p>
                            {word.exampleTranslation && (
                              <p className="text-text-muted italic">{word.exampleTranslation}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/30">
                        <button
                          onClick={() => setTransferringWord(word)}
                          className="px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/50 transition-all text-xs font-semibold flex items-center gap-1.5"
                          title="Transfer word to another topic"
                        >
                          <ArrowRightLeft size={12} /> {"Ko'chirish"}
                        </button>
                        <button
                          onClick={() => handleDeleteWord(word.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:text-danger hover:border-danger/50 transition-all text-xs font-semibold flex items-center gap-1.5"
                          title="Delete word from server"
                        >
                          <Trash2 size={12} /> {"O'chirish"}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="card-glass p-12 text-center border-dashed">
            <BookOpen size={40} className="text-text-muted/40 mx-auto mb-3" />
            <p className="font-semibold text-text-secondary">{"Iltimos, kitob va mavzuni tanlang"}</p>
            <p className="text-xs text-text-muted mt-1">
              {"Boshqaruv elementlarini va so'zlarni yuklash uchun yuqoridagi tanlovchidan kitob va mavzuni tanlang."}
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <WordFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddWordSubmit}
        title="Mavzuga yangi so'z qo'shish"
      />

      <TransferModal
        isOpen={!!transferringWord}
        onClose={() => setTransferringWord(null)}
        word={transferringWord}
        books={books}
        currentTopicId={selectedTopicId}
        onConfirm={handleWordTransferConfirm}
      />
    </div>
  );
}
