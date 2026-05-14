 import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  Animated, BackHandler, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';
import type { GameSession, SessionWord, GameAnswer, GameResult } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Mixed'>;
type QType = 'choice' | 'write';
type AnswerState = 'idle' | 'correct' | 'wrong';

const { width: SCREEN_W } = Dimensions.get('window');

function buildOptions(word: SessionWord, pool: SessionWord[]): string[] {
  const distractors = pool
    .filter(w => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.meaning);
  while (distractors.length < 3) distractors.push(distractors[0] ?? '—');
  return [...distractors, word.meaning].sort(() => Math.random() - 0.5);
}

// Pre-generate a pattern of question types so we get a nice mix
function buildPattern(n: number): QType[] {
  const arr: QType[] = [];
  for (let i = 0; i < n; i++) arr.push(i % 2 === 0 ? 'choice' : 'write');
  return arr.sort(() => Math.random() - 0.5);
}

// ── Multiple Choice sub-component ────────────────────────────────
function ChoicePanel({ word, pool, answered, onAnswer }: {
  word: SessionWord; pool: SessionWord[];
  answered: boolean; onAnswer: (a: string, ms: number) => void;
}) {
  const startAt = useRef(Date.now());
  const [opts] = useState(() => buildOptions(word, pool));
  const [sel, setSel] = useState<string | null>(null);

  const handle = (opt: string) => {
    if (answered || sel) return;
    setSel(opt);
    onAnswer(opt, Date.now() - startAt.current);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '700',
        letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
        Choose the correct meaning
      </Text>
      {opts.map((opt, i) => {
        const isCorrect = opt === word.meaning;
        const isSelected = opt === sel;
        const state: AnswerState =
          !sel         ? 'idle'
          : isSelected && isCorrect ? 'correct'
          : isSelected             ? 'wrong'
          : sel && isCorrect       ? 'correct'   // missed
          : 'idle';
        const border = state === 'correct' ? '#10b981'
                     : state === 'wrong'   ? '#ef4444'
                     : 'rgba(255,255,255,0.08)';
        const bg     = state === 'correct' ? 'rgba(16,185,129,0.14)'
                     : state === 'wrong'   ? 'rgba(239,68,68,0.12)'
                     : 'rgba(14,14,36,0.9)';
        return (
          <TouchableOpacity key={i} onPress={() => handle(opt)} disabled={!!sel} activeOpacity={0.8}>
            <BlurView intensity={14} tint="dark" style={{
              borderRadius: 16, overflow: 'hidden',
              borderWidth: state !== 'idle' ? 2 : 1, borderColor: border,
            }}>
              <View style={{ backgroundColor: bg, flexDirection: 'row', alignItems: 'center',
                paddingVertical: 15, paddingHorizontal: 18, gap: 10 }}>
                <Text style={{ flex: 1, color: state === 'correct' ? '#10b981'
                  : state === 'wrong' ? '#ef4444' : '#d1d5db', fontSize: 14, fontWeight: '500' }}>
                  {opt}
                </Text>
                {state === 'correct' && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                {state === 'wrong'   && <Ionicons name="close-circle"     size={20} color="#ef4444" />}
              </View>
            </BlurView>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Write sub-component ───────────────────────────────────────────
function WritePanel({ word, answered, onAnswer }: {
  word: SessionWord; answered: boolean; onAnswer: (a: string, ms: number) => void;
}) {
  const startAt = useRef(Date.now());
  const [input, setInput] = useState('');
  const [state, setState] = useState<AnswerState>('idle');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const handleSubmit = () => {
    if (state !== 'idle' || !input.trim()) return;
    const ms = Date.now() - startAt.current;
    const trimmed = input.trim().toLowerCase();
    const correct = word.meaning.toLowerCase();
    const isCorrect = correct.includes(trimmed) || trimmed.includes(correct) || trimmed === correct;
    setState(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
      ]).start();
    }
    onAnswer(input.trim(), ms);
  };

  const border = state === 'correct' ? '#10b981' : state === 'wrong' ? '#ef4444' : 'rgba(16,185,129,0.28)';

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '700',
        letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>
        Type the English meaning
      </Text>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <BlurView intensity={16} tint="dark" style={{
          borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(10,10,26,0.88)', paddingHorizontal: 16, paddingVertical: 2 }}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={t => { if (state === 'idle') setInput(t); }}
              onSubmitEditing={handleSubmit}
              placeholder="Type meaning…"
              placeholderTextColor="#374151"
              style={{ flex: 1, color: '#f3f4f6', fontSize: 16, paddingVertical: 14 }}
              returnKeyType="done"
              editable={state === 'idle'}
            />
            <TouchableOpacity onPress={handleSubmit} disabled={!input.trim() || state !== 'idle'}>
              <Ionicons name="send" size={20} color={input.trim() && state === 'idle' ? '#10b981' : '#374151'} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
      {state !== 'idle' && (
        <BlurView intensity={14} tint="dark" style={{
          borderRadius: 14, overflow: 'hidden',
          borderWidth: 1, borderColor: state === 'correct' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
            backgroundColor: state === 'correct' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          }}>
            <Ionicons name={state === 'correct' ? 'checkmark-circle' : 'close-circle'}
              size={18} color={state === 'correct' ? '#10b981' : '#ef4444'} />
            <Text style={{ color: state === 'correct' ? '#10b981' : '#ef4444', fontWeight: '700', fontSize: 13 }}>
              {state === 'correct' ? 'Correct!' : `Answer: ${word.meaning}`}
            </Text>
          </View>
        </BlurView>
      )}
    </View>
  );
}

// ── Badge chip ────────────────────────────────────────────────────
function QTypeBadge({ type }: { type: QType }) {
  const isChoice = type === 'choice';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: isChoice ? 'rgba(109,40,217,0.18)' : 'rgba(16,185,129,0.18)',
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'center',
      borderWidth: 1, borderColor: isChoice ? 'rgba(109,40,217,0.4)' : 'rgba(16,185,129,0.4)',
      marginBottom: 16,
    }}>
      <Ionicons name={isChoice ? 'checkbox' : 'create'} size={12}
        color={isChoice ? '#a78bfa' : '#6ee7b7'} />
      <Text style={{ color: isChoice ? '#a78bfa' : '#6ee7b7', fontSize: 11, fontWeight: '700' }}>
        {isChoice ? 'MULTIPLE CHOICE' : 'WRITE PRACTICE'}
      </Text>
    </View>
  );
}

// ── Mixed Challenge Screen ────────────────────────────────────────
export default function MixedScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [session,    setSession]    = useState<GameSession | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [qIndex,    setQIndex]    = useState(0);
  const [pattern,   setPattern]   = useState<QType[]>([]);
  const [answered,  setAnswered]  = useState(false);
  const [answers,   setAnswers]   = useState<GameAnswer[]>([]);

  const cardOpacity  = useRef(new Animated.Value(1)).current;
  const cardSlide    = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => h.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<GameSession>('/games/session', {
          params: { type: 'TEST', limit: 25 },
        });
        setSession(res.data);
        setPattern(buildPattern(res.data.words.length));
      } catch (e: any) {
        setLoadError(e?.response?.data?.error ?? 'Failed to start session.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!session) return;
    Animated.timing(progressAnim, {
      toValue: (qIndex + 1) / session.words.length,
      duration: 380, useNativeDriver: false,
    }).start();
  }, [qIndex, session]);

  const slideToNext = useCallback(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardSlide,   { toValue: -28, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      cardSlide.setValue(28);
      setQIndex(i => i + 1);
      setAnswered(false);
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(cardSlide,   { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const submitGame = useCallback(async (final: GameAnswer[]) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<GameResult>('/games/submit', {
        sessionId: session.sessionId, answers: final,
      });
      navigation.replace('Result', { result: res.data, mode: 'TEST', sourceScreen: 'Mixed' });
    } catch {
      navigation.replace('Result', {
        result: { sessionId: session.sessionId, gameType: 'TEST',
          totalQuestions: final.length, totalCorrect: 0, accuracy: 0,
          xpEarned: 0, coinsEarned: 0, badgesEarned: [], srsUpdates: [] },
        mode: 'TEST', sourceScreen: 'Mixed',
      });
    } finally { setSubmitting(false); }
  }, [session]);

  const handleAnswer = useCallback((answerText: string, timeMs: number) => {
    if (!session || answered) return;
    const word = session.words[qIndex];
    const newAnswers: GameAnswer[] = [...answers, { wordId: word.id, answer: answerText, timeMs }];
    setAnswers(newAnswers);
    setAnswered(true);
    setTimeout(() => {
      if (qIndex + 1 >= session.words.length) { submitGame(newAnswers); }
      else { slideToNext(); }
    }, 1050);
  }, [session, qIndex, answered, answers, slideToNext, submitGame]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color="#7c3aed" />
      <Text style={{ color: '#6b7280' }}>Building mixed challenge…</Text>
    </View>
  );
  if (loadError || !session) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <Text style={{ fontSize: 40 }}>😵</Text>
      <Text style={{ color: '#f9fafb', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{loadError ?? 'No words'}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{
        backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 14,
        paddingHorizontal: 24, paddingVertical: 12,
        borderWidth: 1, borderColor: '#7c3aed',
      }}>
        <Text style={{ color: '#7c3aed', fontWeight: '600' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
  if (submitting) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={{ color: '#6b7280' }}>Saving results…</Text>
    </View>
  );

  const word  = session.words[qIndex];
  const total = session.words.length;
  const qType = pattern[qIndex] ?? 'choice';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orb */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, left: -80,
        width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(109,40,217,0.08)' }} />

      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 20 }}>
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center',
          paddingTop: 12, paddingBottom: 16, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <View style={{ flex: 1, height: 6, backgroundColor: '#1f2937', borderRadius: 3 }}>
            <Animated.View style={{
              height: 6, borderRadius: 3, backgroundColor: '#7c3aed',
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8, shadowRadius: 6,
            }} />
          </View>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '600' }}>
            {qIndex + 1}/{total}
          </Text>
        </View>

        {/* Word card */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }], marginBottom: 20 }}>
          <BlurView intensity={22} tint="dark" style={{
            borderRadius: 28, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(109,40,217,0.22)',
          }}>
            <LinearGradient
              colors={['rgba(18,18,48,0.95)', 'rgba(8,8,24,0.98)']}
              style={{ paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center' }}
            >
              <QTypeBadge type={qType} />
              <Text style={{
                color: '#f9fafb', fontSize: 50, fontWeight: '700',
                letterSpacing: 4, textAlign: 'center', marginBottom: 10,
                textShadowColor: 'rgba(109,40,217,0.35)',
                textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
              }}>
                {word.japaneseWord}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 18, letterSpacing: 2 }}>
                {word.hiragana}
              </Text>
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* Dynamic question panel */}
        <Animated.View style={{ opacity: cardOpacity }}>
          {qType === 'choice' ? (
            <ChoicePanel
              key={`choice-${qIndex}`}
              word={word}
              pool={session.words}
              answered={answered}
              onAnswer={handleAnswer}
            />
          ) : (
            <WritePanel
              key={`write-${qIndex}`}
              word={word}
              answered={answered}
              onAnswer={handleAnswer}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}
