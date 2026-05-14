'use client';

import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// ─── Data ─────────────────────────────────────────────────────────────────────

const HIRAGANA: { kana: string; romaji: string }[] = [
  // a-row
  { kana: 'あ', romaji: 'a' }, { kana: 'い', romaji: 'i' }, { kana: 'う', romaji: 'u' }, { kana: 'え', romaji: 'e' }, { kana: 'お', romaji: 'o' },
  // k-row
  { kana: 'か', romaji: 'ka' }, { kana: 'き', romaji: 'ki' }, { kana: 'く', romaji: 'ku' }, { kana: 'け', romaji: 'ke' }, { kana: 'こ', romaji: 'ko' },
  // s-row
  { kana: 'さ', romaji: 'sa' }, { kana: 'し', romaji: 'shi' }, { kana: 'す', romaji: 'su' }, { kana: 'せ', romaji: 'se' }, { kana: 'そ', romaji: 'so' },
  // t-row
  { kana: 'た', romaji: 'ta' }, { kana: 'ち', romaji: 'chi' }, { kana: 'つ', romaji: 'tsu' }, { kana: 'て', romaji: 'te' }, { kana: 'と', romaji: 'to' },
  // n-row
  { kana: 'な', romaji: 'na' }, { kana: 'に', romaji: 'ni' }, { kana: 'ぬ', romaji: 'nu' }, { kana: 'ね', romaji: 'ne' }, { kana: 'の', romaji: 'no' },
  // h-row
  { kana: 'は', romaji: 'ha' }, { kana: 'ひ', romaji: 'hi' }, { kana: 'ふ', romaji: 'fu' }, { kana: 'へ', romaji: 'he' }, { kana: 'ほ', romaji: 'ho' },
  // m-row
  { kana: 'ま', romaji: 'ma' }, { kana: 'み', romaji: 'mi' }, { kana: 'む', romaji: 'mu' }, { kana: 'め', romaji: 'me' }, { kana: 'も', romaji: 'mo' },
  // y-row
  { kana: 'や', romaji: 'ya' }, { kana: '　', romaji: '' },   { kana: 'ゆ', romaji: 'yu' }, { kana: '　', romaji: '' },   { kana: 'よ', romaji: 'yo' },
  // r-row
  { kana: 'ら', romaji: 'ra' }, { kana: 'り', romaji: 'ri' }, { kana: 'る', romaji: 'ru' }, { kana: 'れ', romaji: 're' }, { kana: 'ろ', romaji: 'ro' },
  // w-row
  { kana: 'わ', romaji: 'wa' }, { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: 'を', romaji: 'wo' },
  // n
  { kana: 'ん', romaji: 'n' },  { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },
];

const KATAKANA: { kana: string; romaji: string }[] = [
  { kana: 'ア', romaji: 'a' }, { kana: 'イ', romaji: 'i' }, { kana: 'ウ', romaji: 'u' }, { kana: 'エ', romaji: 'e' }, { kana: 'オ', romaji: 'o' },
  { kana: 'カ', romaji: 'ka' }, { kana: 'キ', romaji: 'ki' }, { kana: 'ク', romaji: 'ku' }, { kana: 'ケ', romaji: 'ke' }, { kana: 'コ', romaji: 'ko' },
  { kana: 'サ', romaji: 'sa' }, { kana: 'シ', romaji: 'shi' }, { kana: 'ス', romaji: 'su' }, { kana: 'セ', romaji: 'se' }, { kana: 'ソ', romaji: 'so' },
  { kana: 'タ', romaji: 'ta' }, { kana: 'チ', romaji: 'chi' }, { kana: 'ツ', romaji: 'tsu' }, { kana: 'テ', romaji: 'te' }, { kana: 'ト', romaji: 'to' },
  { kana: 'ナ', romaji: 'na' }, { kana: 'ニ', romaji: 'ni' }, { kana: 'ヌ', romaji: 'nu' }, { kana: 'ネ', romaji: 'ne' }, { kana: 'ノ', romaji: 'no' },
  { kana: 'ハ', romaji: 'ha' }, { kana: 'ヒ', romaji: 'hi' }, { kana: 'フ', romaji: 'fu' }, { kana: 'ヘ', romaji: 'he' }, { kana: 'ホ', romaji: 'ho' },
  { kana: 'マ', romaji: 'ma' }, { kana: 'ミ', romaji: 'mi' }, { kana: 'ム', romaji: 'mu' }, { kana: 'メ', romaji: 'me' }, { kana: 'モ', romaji: 'mo' },
  { kana: 'ヤ', romaji: 'ya' }, { kana: '　', romaji: '' },   { kana: 'ユ', romaji: 'yu' }, { kana: '　', romaji: '' },   { kana: 'ヨ', romaji: 'yo' },
  { kana: 'ラ', romaji: 'ra' }, { kana: 'リ', romaji: 'ri' }, { kana: 'ル', romaji: 'ru' }, { kana: 'レ', romaji: 're' }, { kana: 'ロ', romaji: 'ro' },
  { kana: 'ワ', romaji: 'wa' }, { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: 'ヲ', romaji: 'wo' },
  { kana: 'ン', romaji: 'n' },  { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },   { kana: '　', romaji: '' },
];

const HEADERS = ['a', 'i', 'u', 'e', 'o'];

// ─── Components ───────────────────────────────────────────────────────────────

function KanaCell({ kana, romaji }: { kana: string; romaji: string }) {
  const isEmpty = kana.trim() === '';
  const [playing, setPlaying] = useState(false);

  const playKana = async () => {
    if (isEmpty || playing) return;
    setPlaying(true);
    try {
      const url = `${API_BASE}/tts?text=${encodeURIComponent(kana)}&voice=ja-JP-NanamiNeural`;
      const res  = await fetch(url);
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setPlaying(false);
      audio.play();
    } catch { setPlaying(false); }
  };

  if (isEmpty) return <div className="h-16" />;

  return (
    <button
      onClick={playKana}
      className={cn(
        'group relative h-16 rounded-xl border transition-all duration-150',
        'flex flex-col items-center justify-center gap-0.5',
        playing
          ? 'bg-primary/20 border-primary shadow-glow-sm scale-105'
          : 'bg-surface/60 border-border hover:border-primary/50 hover:bg-surface-2/60 hover:scale-105',
      )}
    >
      <span className="text-xl font-bold text-text-primary">{kana}</span>
      <span className="text-xs text-text-muted group-hover:text-primary transition-colors">{romaji}</span>
      {playing && (
        <span className="absolute top-1 right-1">
          <Volume2 size={10} className="text-primary animate-pulse" />
        </span>
      )}
    </button>
  );
}

// ─── Alifbo Page ──────────────────────────────────────────────────────────────

type Tab = 'hiragana' | 'katakana' | 'both';

export default function AlifboPage() {
  const [tab, setTab] = useState<Tab>('hiragana');

  const showHiragana = tab === 'hiragana' || tab === 'both';
  const showKatakana = tab === 'katakana' || tab === 'both';

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-text-primary mb-2">🈳 Kana Reference</h1>
        <p className="text-text-muted max-w-md mx-auto text-sm">
          Click any character to hear its pronunciation. Master hiragana and katakana!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {(['hiragana', 'katakana', 'both'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-semibold border transition-all',
              tab === t
                ? 'bg-primary border-primary text-white shadow-glow-sm'
                : 'border-border text-text-muted hover:border-primary/50',
            )}
          >
            {t === 'hiragana' ? 'Hiragana (あ)' : t === 'katakana' ? 'Katakana (ア)' : 'Both'}
          </button>
        ))}
      </div>

      <div className={cn('gap-8', tab === 'both' ? 'grid grid-cols-1 lg:grid-cols-2' : '')}>
        {/* Hiragana Grid */}
        {showHiragana && (
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-4 text-center">
              Hiragana <span className="text-text-muted text-sm font-normal">(ひらがな)</span>
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {/* Column headers */}
              {HEADERS.map((h) => (
                <div key={h} className="h-8 flex items-center justify-center text-xs text-text-muted font-semibold">
                  {h}
                </div>
              ))}
              {HIRAGANA.map((item, i) => (
                <KanaCell key={i} kana={item.kana} romaji={item.romaji} />
              ))}
            </div>
          </section>
        )}

        {/* Katakana Grid */}
        {showKatakana && (
          <section>
            <h2 className="text-lg font-bold text-text-primary mb-4 text-center">
              Katakana <span className="text-text-muted text-sm font-normal">(カタカナ)</span>
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {HEADERS.map((h) => (
                <div key={h} className="h-8 flex items-center justify-center text-xs text-text-muted font-semibold">
                  {h}
                </div>
              ))}
              {KATAKANA.map((item, i) => (
                <KanaCell key={i} kana={item.kana} romaji={item.romaji} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Legend */}
      <div className="mt-10 card-glass p-5 max-w-xl mx-auto text-center">
        <p className="text-sm text-text-muted">
          💡 Click any cell to hear the <span className="text-primary font-medium">natural Japanese pronunciation</span>{' '}
          via Microsoft Edge TTS. Each syllable is cached for instant playback.
        </p>
      </div>
    </div>
  );
}
