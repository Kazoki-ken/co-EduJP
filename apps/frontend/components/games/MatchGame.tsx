'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameSession, GameAnswer, SessionWord } from '@/lib/types';

type Tile = {
  id:       string;
  text:     string;
  wordId:   string;
  side:     'jp' | 'en';
  matched:  boolean;
};

interface MatchGameProps {
  session:    GameSession;
  onComplete: (answers: GameAnswer[]) => void;
}

export function MatchGame({ session, onComplete }: MatchGameProps) {
  const delay = useSafeTimeout();
  const words = session.words;
  const startedAt = useRef<number>(Date.now());
  const ROUND_SIZE = 10;
  const totalRounds = Math.ceil(words.length / ROUND_SIZE);

  const [tiles,    setTiles]    = useState<Tile[]>([]);
  const [selectedA, setSelectedA] = useState<Tile | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [matched,  setMatched]  = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [lives,    setLives]    = useState(5);
  const [answers,  setAnswers]  = useState<GameAnswer[]>([]);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (words.length === 0) return;

    const startIdx = (currentRound - 1) * ROUND_SIZE;
    const endIdx = startIdx + ROUND_SIZE;
    const roundWords = words.slice(startIdx, endIdx);

    const shuffledWords = [...roundWords].sort(() => Math.random() - 0.5);
    const jpTiles: Tile[] = shuffledWords.map((w) => ({
      id: `jp-${w.id}`,
      text: w.hiragana && w.hiragana !== w.japaneseWord ? `${w.japaneseWord} (${w.hiragana})` : w.japaneseWord,
      wordId: w.id,
      side: 'jp',
      matched: false,
    }));
    const enTiles: Tile[] = shuffledWords.map((w) => ({
      id: `en-${w.id}`, text: w.meaning, wordId: w.id, side: 'en', matched: false,
    }));
    // Sort each column independently for visual shuffle
    const shuffledJp = jpTiles.sort(() => Math.random() - 0.5);
    const shuffledEn = enTiles.sort(() => Math.random() - 0.5);
    setTiles([...shuffledJp, ...shuffledEn]);
    setSelectedA(null);
    setWrongPair(null);
  }, [words, currentRound]);

  const handleSelect = useCallback((tile: Tile) => {
    if (isAnimating.current || tile.matched || lives <= 0) return;

    if (!selectedA) {
      setSelectedA(tile);
      return;
    }

    // Can't select two from the same column
    if (selectedA.side === tile.side) {
      setSelectedA(tile);
      return;
    }

    const timeMs = Date.now() - startedAt.current;

    if (selectedA.wordId === tile.wordId) {
      // MATCH
      isAnimating.current = true;
      setTiles((prev) => prev.map((t) =>
        t.wordId === tile.wordId ? { ...t, matched: true } : t,
      ));
      setSelectedA(null);
      const newMatched = matched + 1;
      setMatched(newMatched);

      const newAnswer: GameAnswer = { wordId: tile.wordId, answer: tile.side === 'en' ? tile.text : selectedA.text, timeMs };
      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      const roundWordsCount = Math.min(ROUND_SIZE, words.length - (currentRound - 1) * ROUND_SIZE);

      delay(() => {
        isAnimating.current = false;
        if (newMatched >= roundWordsCount) {
          if (currentRound < totalRounds) {
            setCurrentRound((r) => r + 1);
            setMatched(0);
          } else {
            onComplete(updatedAnswers);
          }
        }
      }, 300);
    } else {
      // MISMATCH — flash red, deselect, lose a life
      isAnimating.current = true;
      setWrongPair([selectedA.id, tile.id]);
      const wrongAnswer: GameAnswer = {
        wordId: selectedA.wordId,
        answer: tile.side === 'en' ? tile.text : selectedA.text,
        timeMs,
      };
      const updatedAnswers = [...answers, wrongAnswer];
      setAnswers(updatedAnswers);

      setLives((prev) => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          delay(() => {
            onComplete(updatedAnswers);
          }, 600);
        }
        return nextLives;
      });

      delay(() => {
        setWrongPair(null);
        setSelectedA(null);
        isAnimating.current = false;
      }, 600);
    }
  }, [selectedA, matched, words, answers, lives, currentRound, totalRounds, onComplete, delay]);

  const progress = (((currentRound - 1) * ROUND_SIZE + matched) / words.length) * 100;
  const jpTiles  = tiles.filter((t) => t.side === 'jp');
  const enTiles  = tiles.filter((t) => t.side === 'en');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Progress & Lives */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <span className="text-xs text-text-muted shrink-0">
            Raund {currentRound}/{totalRounds} ({((currentRound - 1) * ROUND_SIZE + matched)}/{words.length})
          </span>
        </div>

        {/* Lives Display */}
        <div className="flex items-center gap-1 shrink-0 bg-surface/30 px-3 py-1.5 rounded-full border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart
              key={i}
              size={16}
              className={cn(
                'transition-all duration-300',
                i < lives ? 'text-red-500 fill-red-500 scale-100' : 'text-text-muted opacity-20 scale-75'
              )}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-text-muted mb-5">
        Click a Japanese word, then its English meaning to match the pair.
      </p>

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {jpTiles.map((tile) => (
            <MatchTile
              key={tile.id}
              tile={tile}
              isSelected={selectedA?.id === tile.id}
              isWrong={wrongPair?.includes(tile.id) ?? false}
              onClick={() => handleSelect(tile)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {enTiles.map((tile) => (
            <MatchTile
              key={tile.id}
              tile={tile}
              isSelected={selectedA?.id === tile.id}
              isWrong={wrongPair?.includes(tile.id) ?? false}
              onClick={() => handleSelect(tile)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchTile({
  tile, isSelected, isWrong, onClick,
}: {
  tile: Tile; isSelected: boolean; isWrong: boolean; onClick: () => void;
}) {
  return (
    <AnimatePresence>
      {!tile.matched && (
        <motion.button
          layout
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileTap={{ scale: 0.96 }}
          animate={isWrong ? { x: [-6, 6, -6, 0] } : {}}
          transition={{ duration: 0.3 }}
          onClick={onClick}
          className={cn(
            'w-full px-3 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150',
            isWrong
              ? 'bg-danger/20 border-danger text-danger'
              : isSelected
                ? 'bg-primary/20 border-primary text-primary shadow-glow-sm'
                : 'bg-surface/60 border-border text-text-secondary hover:border-primary/50 hover:text-text-primary',
          )}
        >
          {tile.text}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
