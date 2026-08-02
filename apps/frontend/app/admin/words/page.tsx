'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Edit2, Trash2, X, ChevronDown, Save,
  AlertCircle, Check, Loader2, BookOpen, Tag, HelpCircle
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import type { Word, Book, Topic, KanjiInfo, AdditionalExample, CompoundWord } from '@/lib/types';

interface WordsResponse {
  data: Word[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Modal Dialog for Add/Edit Word ──────────────────────────────────────────

interface WordFormModalProps {
  word: Word | null; // null for add mode
  books: Book[];
  topics: Topic[];
  onClose: () => void;
  onSuccess: () => void;
}

function WordFormModal({ word, books, topics, onClose, onSuccess }: WordFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'forms' | 'kanji' | 'relations'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [japaneseWord, setJapaneseWord] = useState('');
  const [hiragana, setHiragana] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [jlptLevel, setJlptLevel] = useState('');
  const [frequency, setFrequency] = useState('');
  const [pitchAccent, setPitchAccent] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');

  // Verb/Adj Forms
  const [teForm, setTeForm] = useState('');
  const [taForm, setTaForm] = useState('');
  const [naiForm, setNaiForm] = useState('');
  const [masuForm, setMasuForm] = useState('');

  // Lists states
  const [additionalExamples, setAdditionalExamples] = useState<AdditionalExample[]>([]);
  const [kanjiInfo, setKanjiInfo] = useState<KanjiInfo[]>([]);
  const [compounds, setCompounds] = useState<CompoundWord[]>([]);
  
  const [synonymsText, setSynonymsText] = useState('');
  const [antonymsText, setAntonymsText] = useState('');
  const [nuance, setNuance] = useState('');

  // Selected topics
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');

  // Load existing word data if in edit mode
  useEffect(() => {
    if (word) {
      setJapaneseWord(word.japaneseWord);
      setHiragana(word.hiragana || '');
      setMeaning(word.meaning);
      setPartOfSpeech(word.partOfSpeech || '');
      setJlptLevel(word.jlptLevel || '');
      setFrequency(word.frequency || '');
      setPitchAccent(word.pitchAccent || '');
      setExampleSentence(word.exampleSentence || '');
      setExampleTranslation(word.exampleTranslation || '');
      setTeForm(word.teForm || '');
      setTaForm(word.taForm || '');
      setNaiForm(word.naiForm || '');
      setMasuForm(word.masuForm || '');
      setAdditionalExamples(word.additionalExamples || []);
      setKanjiInfo(word.kanjiInfo || []);
      setCompounds(word.compounds || []);
      setSynonymsText(word.synonyms?.join(', ') || '');
      setAntonymsText(word.antonyms?.join(', ') || '');
      setNuance(word.nuance || '');
      setSelectedTopics(word.wordTopics.map((wt) => wt.topic.id));
      
      // Auto select book if topic has a book
      const firstTopicId = word.wordTopics[0]?.topic.id;
      const matchedTopic = topics.find((t) => t.id === firstTopicId);
      if (matchedTopic?.bookId) {
        setSelectedBookId(matchedTopic.bookId);
      }
    }
  }, [word, topics]);

  const addKanjiRow = () => {
    setKanjiInfo([...kanjiInfo, { kanji: '', meaning: '', kunReading: '', onReading: '', strokes: 0 }]);
  };

  const updateKanjiRow = (index: number, field: keyof KanjiInfo, val: any) => {
    const updated = [...kanjiInfo];
    updated[index] = { ...updated[index], [field]: val };
    setKanjiInfo(updated);
  };

  const removeKanjiRow = (index: number) => {
    setKanjiInfo(kanjiInfo.filter((_, i) => i !== index));
  };

  const addExampleRow = () => {
    setAdditionalExamples([...additionalExamples, { sentence: '', translation: '' }]);
  };

  const updateExampleRow = (index: number, field: keyof AdditionalExample, val: string) => {
    const updated = [...additionalExamples];
    updated[index] = { ...updated[index], [field]: val };
    setAdditionalExamples(updated);
  };

  const removeExampleRow = (index: number) => {
    setAdditionalExamples(additionalExamples.filter((_, i) => i !== index));
  };

  const addCompoundRow = () => {
    setCompounds([...compounds, { word: '', hiragana: '', meaning: '' }]);
  };

  const updateCompoundRow = (index: number, field: keyof CompoundWord, val: string) => {
    const updated = [...compounds];
    updated[index] = { ...updated[index], [field]: val };
    setCompounds(updated);
  };

  const removeCompoundRow = (index: number) => {
    setCompounds(compounds.filter((_, i) => i !== index));
  };

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!japaneseWord.trim() || !meaning.trim()) {
      setError("So'z va tarjima majburiy maydonlar hisoblanadi!");
      return;
    }

    setLoading(true);
    setError(null);

    const synonyms = synonymsText.split(',').map((s) => s.trim()).filter(Boolean);
    const antonyms = antonymsText.split(',').map((s) => s.trim()).filter(Boolean);

    const data = {
      japaneseWord: japaneseWord.trim(),
      hiragana: hiragana.trim() || japaneseWord.trim(),
      meaning: meaning.trim(),
      exampleSentence: exampleSentence.trim() || null,
      exampleTranslation: exampleTranslation.trim() || null,
      partOfSpeech: partOfSpeech.trim() || null,
      jlptLevel: jlptLevel || null,
      frequency: frequency.trim() || null,
      pitchAccent: pitchAccent.trim() || null,
      teForm: teForm.trim() || null,
      taForm: taForm.trim() || null,
      naiForm: naiForm.trim() || null,
      masuForm: masuForm.trim() || null,
      synonyms,
      antonyms,
      nuance: nuance.trim() || null,
      kanjiInfo: kanjiInfo.filter(k => k.kanji.trim()),
      additionalExamples: additionalExamples.filter(ex => ex.sentence.trim()),
      compounds: compounds.filter(c => c.word.trim()),
      topicIds: selectedTopics,
    };

    try {
      if (word) {
        await api.put(`/words/${word.id}`, data);
      } else {
        await api.post('/words', data);
      }
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Saqlashda xatolik yuz berdi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = selectedBookId
    ? topics.filter((t) => t.bookId === selectedBookId)
    : topics;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card-glass max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            {word ? "So'zni tahrirlash" : "Yangi so'z qo'shish"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-2 transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        {/* Form tabs */}
        <div className="flex border-b border-border bg-surface-2/30 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={cn('px-4 py-2.5 text-sm font-medium transition-colors border-b-2 shrink-0',
              activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            Asosiy ma'lumotlar
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={cn('px-4 py-2.5 text-sm font-medium transition-colors border-b-2 shrink-0',
              activeTab === 'forms' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            Shakllari & Misollar
          </button>
          <button
            onClick={() => setActiveTab('kanji')}
            className={cn('px-4 py-2.5 text-sm font-medium transition-colors border-b-2 shrink-0',
              activeTab === 'kanji' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            Kanji tarkibi
          </button>
          <button
            onClick={() => setActiveTab('relations')}
            className={cn('px-4 py-2.5 text-sm font-medium transition-colors border-b-2 shrink-0',
              activeTab === 'relations' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            Sinonim/Antonimlar & Birikmalar
          </button>
        </div>

        {/* Content scroll area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">So'z (Kanji/Kana) *</label>
                  <input
                    type="text"
                    required
                    value={japaneseWord}
                    onChange={(e) => setJapaneseWord(e.target.value)}
                    placeholder="Masalan: 食べる, 学生"
                    className="input-field text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Xiragana / Furigana</label>
                  <input
                    type="text"
                    value={hiragana}
                    onChange={(e) => setHiragana(e.target.value)}
                    placeholder="Masalan: たべる, がくせい"
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Tarjimasi (O'zbekcha) *</label>
                <input
                  type="text"
                  required
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Masalan: yemoq, talaba"
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">So'z turi</label>
                  <select
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Tanlang...</option>
                    <option value="ot">Ot (Noun)</option>
                    <option value="fe'l">Fe'l (Verb)</option>
                    <option value="sifat">Sifat (Adjective)</option>
                    <option value="ravish">Ravish (Adverb)</option>
                    <option value="zarracha">Zarracha (Particle)</option>
                    <option value="olmosh">Olmosh (Pronoun)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">JLPT Darajasi</label>
                  <select
                    value={jlptLevel}
                    onChange={(e) => setJlptLevel(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Tanlang...</option>
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Chastotasi</label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="Masalan: Top 5000"
                    className="input-field text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Pitch Accent (Urg'u)</label>
                  <input
                    type="text"
                    value={pitchAccent}
                    onChange={(e) => setPitchAccent(e.target.value)}
                    placeholder="Masalan: ①, ⓪"
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-bold text-text-primary">Mavzularga ulash</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Kitob bo'yicha filterlash</label>
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Barcha kitoblar</option>
                      {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Mavzular (Kamida bittasini belgilang)</label>
                  <div className="h-40 overflow-y-auto border border-border rounded-xl p-3 bg-surface-2/30 space-y-1">
                    {filteredTopics.length === 0 ? (
                      <p className="text-xs text-text-muted">Mavzular topilmadi.</p>
                    ) : (
                      filteredTopics.map((t) => {
                        const isChecked = selectedTopics.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleTopicToggle(t.id)}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors',
                              isChecked ? 'bg-primary/10 text-primary' : 'hover:bg-surface-2 text-text-secondary'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                              isChecked ? 'bg-primary border-primary text-white' : 'border-border'
                            )}>
                              {isChecked && <Check size={10} />}
                            </div>
                            <span>
                              {t.name} {t.book ? `(${t.book.title})` : ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONJUGATIONS & EXAMPLES */}
          {activeTab === 'forms' && (
            <div className="space-y-6">
              {(partOfSpeech === 'fe\'l' || partOfSpeech === 'sifat') && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text-primary">Tuslanish shakllari (Faqat fe'l va sifatlar uchun)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">te-form (Tuslanish)</label>
                      <input
                        type="text"
                        value={teForm}
                        onChange={(e) => setTeForm(e.target.value)}
                        placeholder="Masalan: 食べて"
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">ta-form (O'tgan zamon)</label>
                      <input
                        type="text"
                        value={taForm}
                        onChange={(e) => setTaForm(e.target.value)}
                        placeholder="Masalan: 食べた"
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">nai-form (Inkor)</label>
                      <input
                        type="text"
                        value={naiForm}
                        onChange={(e) => setNaiForm(e.target.value)}
                        placeholder="Masalan: 食べない"
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">masu-form (Hurmat)</label>
                      <input
                        type="text"
                        value={masuForm}
                        onChange={(e) => setMasuForm(e.target.value)}
                        placeholder="Masalan: 食べます"
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-bold text-text-primary">Namunaviy misollar</h3>
                
                {/* Main example */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Asosiy gap (Yaponcha)</label>
                    <input
                      type="text"
                      value={exampleSentence}
                      onChange={(e) => setExampleSentence(e.target.value)}
                      placeholder="Masalan: 私はりんごを食べます。"
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Asosiy gap tarjimasi (O'zbekcha)</label>
                    <input
                      type="text"
                      value={exampleTranslation}
                      onChange={(e) => setExampleTranslation(e.target.value)}
                      placeholder="Masalan: Men olma yeyman."
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                {/* Additional examples */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary">Qo'shimcha gaplar (2-3 ta)</label>
                    <button
                      type="button"
                      onClick={addExampleRow}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Qo'shish
                    </button>
                  </div>

                  <div className="space-y-3">
                    {additionalExamples.map((ex, index) => (
                      <div key={index} className="flex gap-2 items-start bg-surface-2/20 border border-border/50 rounded-xl p-3 relative">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={ex.sentence}
                            onChange={(e) => updateExampleRow(index, 'sentence', e.target.value)}
                            placeholder="Qo'shimcha yaponcha gap..."
                            className="input-field text-xs"
                          />
                          <input
                            type="text"
                            value={ex.translation}
                            onChange={(e) => updateExampleRow(index, 'translation', e.target.value)}
                            placeholder="Tarjimasi..."
                            className="input-field text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExampleRow(index)}
                          className="text-text-muted hover:text-danger p-1 rounded-lg hover:bg-surface-2 transition-colors mt-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KANJI INFO */}
          {activeTab === 'kanji' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Iyerogliflar tarkibi (Kanji)</h3>
                  <p className="text-xs text-text-muted mt-0.5">So'zdagi har bir kanjining o'qilishi va chiziqlar sonini kiriting.</p>
                </div>
                <button
                  type="button"
                  onClick={addKanjiRow}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                >
                  <Plus size={12} /> Kanji qo'shish
                </button>
              </div>

              <div className="space-y-4">
                {kanjiInfo.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">Kanjilar qo'shilmagan.</p>
                ) : (
                  kanjiInfo.map((k, index) => (
                    <div key={index} className="bg-surface-2/20 border border-border/50 rounded-xl p-4 relative space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-xs font-bold text-primary">Kanji #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeKanjiRow(index)}
                          className="text-text-muted hover:text-danger p-1 rounded-lg hover:bg-surface-2 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Kanji</label>
                          <input
                            type="text"
                            required
                            value={k.kanji}
                            onChange={(e) => updateKanjiRow(index, 'kanji', e.target.value)}
                            placeholder="Masalan: 食"
                            className="input-field text-xs"
                          />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Ma'nosi</label>
                          <input
                            type="text"
                            value={k.meaning}
                            onChange={(e) => updateKanjiRow(index, 'meaning', e.target.value)}
                            placeholder="Yemoq"
                            className="input-field text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Kun-o'qilishi</label>
                          <input
                            type="text"
                            value={k.kunReading}
                            onChange={(e) => updateKanjiRow(index, 'kunReading', e.target.value)}
                            placeholder="ta(beru)"
                            className="input-field text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">On-o'qilishi</label>
                          <input
                            type="text"
                            value={k.onReading}
                            onChange={(e) => updateKanjiRow(index, 'onReading', e.target.value)}
                            placeholder="shoku"
                            className="input-field text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">Chiziqlar</label>
                          <input
                            type="number"
                            value={k.strokes || ''}
                            onChange={(e) => updateKanjiRow(index, 'strokes', Number(e.target.value))}
                            placeholder="9"
                            className="input-field text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RELATIONSHIPS */}
          {activeTab === 'relations' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-primary">Sinonimlar va Antonimlar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      Sinonimlar <span title="Vergul bilan ajratib yozing"><HelpCircle size={12} className="text-text-muted" /></span>
                    </label>
                    <input
                      type="text"
                      value={synonymsText}
                      onChange={(e) => setSynonymsText(e.target.value)}
                      placeholder="Masalan: 召し上がる, 食らう"
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      Antonimlar <span title="Vergul bilan ajratib yozing"><HelpCircle size={12} className="text-text-muted" /></span>
                    </label>
                    <input
                      type="text"
                      value={antonymsText}
                      onChange={(e) => setAntonymsText(e.target.value)}
                      placeholder="Masalan: 吐き出す"
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">So'zlar orasidagi farq (Nuans)</label>
                  <textarea
                    value={nuance}
                    onChange={(e) => setNuance(e.target.value)}
                    placeholder="Sinonimlar yoki antonimlar orasidagi ma'no farqlarini yoki qo'llanilish doiralarini izohlang..."
                    className="input-field text-sm h-24 py-2"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">Birikma so'zlar (Compounds)</h3>
                  <button
                    type="button"
                    onClick={addCompoundRow}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Birikma qo'shish
                  </button>
                </div>

                <div className="space-y-3">
                  {compounds.map((c, index) => (
                    <div key={index} className="flex gap-2 items-start bg-surface-2/20 border border-border/50 rounded-xl p-3 relative">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          value={c.word}
                          onChange={(e) => updateCompoundRow(index, 'word', e.target.value)}
                          placeholder="Birikma so'z (Masalan: 食堂)"
                          className="input-field text-xs"
                        />
                        <input
                          type="text"
                          value={c.hiragana}
                          onChange={(e) => updateCompoundRow(index, 'hiragana', e.target.value)}
                          placeholder="Xiraganasi (Masalan: しょくどう)"
                          className="input-field text-xs"
                        />
                        <input
                          type="text"
                          value={c.meaning}
                          onChange={(e) => updateCompoundRow(index, 'meaning', e.target.value)}
                          placeholder="Ma'nosi (Masalan: oshxona)"
                          className="input-field text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompoundRow(index)}
                        className="text-text-muted hover:text-danger p-1 rounded-lg hover:bg-surface-2 transition-colors mt-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-surface-2/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Saqlash
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Admin Words Page ───────────────────────────────────────────────────

export default function AdminWordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [meta, setMeta] = useState<WordsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [books, setBooks] = useState<Book[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedJlpt, setSelectedJlpt] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [formWord, setFormWord] = useState<Word | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState<Word | null>(null);
  
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWords = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<WordsResponse>('/words', {
        params: {
          page: pg,
          limit: 15,
          ...(search && { search }),
          ...(selectedBookId && { bookId: selectedBookId }),
          ...(selectedTopicId && { topicId: selectedTopicId }),
        },
      });
      
      // Local JLPT filtering if selected (Prisma API doesn't support JLPT query filter natively yet)
      let filteredData = data.data;
      if (selectedJlpt) {
        filteredData = filteredData.filter((w) => w.jlptLevel === selectedJlpt);
      }

      setWords(filteredData);
      setMeta(data.meta);
    } catch {
      setError("So'zlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBookId, selectedTopicId, selectedJlpt]);

  useEffect(() => {
    // Load books and topics for dropdown filters
    api.get<{ data: Book[] }>('/books', { params: { limit: 500 } })
      .then(({ data }) => setBooks(data.data))
      .catch(() => {});
    api.get<Topic[]>('/topics')
      .then(({ data }) => setTopics(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchWords(1), search ? 350 : 0);
  }, [search, selectedBookId, selectedTopicId, selectedJlpt]); // eslint-disable-line

  useEffect(() => {
    fetchWords();
  }, [page]); // eslint-disable-line

  const toast = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleEditClick = (w: Word) => {
    // Fetch full word detail first to ensure we get all relation fields (kanjiInfo, synonyms, etc.)
    api.get<Word>(`/words/${w.id}`)
      .then(({ data }) => {
        setFormWord(data);
        setShowFormModal(true);
      })
      .catch(() => {
        toast("So'z tafsilotlarini yuklab bo'lmadi.");
      });
  };

  const handleAddClick = () => {
    setFormWord(null);
    setShowFormModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteWord) return;
    try {
      await api.delete(`/words/${confirmDeleteWord.id}`);
      toast("So'z o'chirildi.");
      setConfirmDeleteWord(null);
      fetchWords();
    } catch {
      toast("So'zni o'chirib bo'lmadi.");
    }
  };

  const activeTopics = selectedBookId
    ? topics.filter((t) => t.bookId === selectedBookId)
    : topics;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary mb-1">So'zlar boshqaruvi</h1>
          <p className="text-text-muted text-sm">Platformadagi barcha yaponcha so'zlarni boshqarish.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus size={15} /> Yangi so'z qo'shish
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidiruv (So'z, xiragana yoki ma'no)..."
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={selectedBookId}
            onChange={(e) => { setSelectedBookId(e.target.value); setSelectedTopicId(''); }}
            className="input-field pr-8 appearance-none cursor-pointer text-sm"
          >
            <option value="">Barcha kitoblar</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="input-field pr-8 appearance-none cursor-pointer text-sm"
          >
            <option value="">Barcha mavzular</option>
            {activeTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={selectedJlpt}
            onChange={(e) => setSelectedJlpt(e.target.value)}
            className="input-field pr-8 appearance-none cursor-pointer text-sm"
          >
            <option value="">Barcha JLPT</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* ── Toast Alert ─────────────────────────────────────────── */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2"
          >
            <Check size={14} /> {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ───────────────────────────────────────────────── */}
      {error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
        </div>
      ) : words.length === 0 ? (
        <div className="card-glass p-12 text-center text-text-muted text-sm">
          So'zlar topilmadi.
        </div>
      ) : (
        <>
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">So'z / Furigana</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Ma'nosi</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">JLPT</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">So'z turi</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Mavzu</th>
                    <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {words.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-text-primary text-base">{w.japaneseWord}</p>
                          {w.hiragana && w.hiragana !== w.japaneseWord && (
                            <p className="text-xs text-primary font-medium">({w.hiragana})</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                        {w.meaning}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {w.jlptLevel ? (
                          <span className="badge-chip bg-primary/10 text-primary border border-primary/20 text-xs">
                            {w.jlptLevel}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-text-muted capitalize">
                        {w.partOfSpeech || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-text-muted text-xs">
                        {w.wordTopics.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {w.wordTopics.map((wt) => (
                              <span key={wt.topic.id} className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-[10px]">
                                {wt.topic.name}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(w)}
                            title="Tahrirlash"
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteWord(w)}
                            title="O'chirish"
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={setPage}
            />
          )}
        </>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showFormModal && (
          <WordFormModal
            word={formWord}
            books={books}
            topics={topics}
            onClose={() => setShowFormModal(false)}
            onSuccess={() => {
              setShowFormModal(false);
              toast(formWord ? "So'z yangilandi." : "Yangi so'z yaratildi.");
              fetchWords();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ────────────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="card-glass p-6 max-w-sm w-full space-y-4">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-text-primary">So'zni o'chirishni tasdiqlaysizmi?</p>
                  <p className="text-xs text-text-muted mt-1">
                    "{confirmDeleteWord.japaneseWord}" so'zini o'chirish jadvallardagi barcha aloqalarni buzadi. Bu amalni ortga qaytarib bo'lmaydi.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteWord(null)} className="btn-ghost flex-1 py-2 text-sm">
                  Bekor qilish
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-danger text-white hover:bg-danger/80 transition-colors"
                >
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
