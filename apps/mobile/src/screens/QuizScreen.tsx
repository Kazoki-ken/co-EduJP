import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Animated, Dimensions, BackHandler,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';
import type { GameSession, SessionWord, GameAnswer, GameResult } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Quiz'>;

const { width: SCREEN_W } = Dimensions.get('window');
const OPTION_COUNT = 4;

// ─── Generate wrong options from word pool ────────────────────────
function buildOptions(correct: SessionWord, all: SessionWord[]): string[] {
  const pool = all
    .filter(w => w.id !== correct.id)
    .map(w => w.meaning)
    .sort(() => Math.random() - 0.5)
    .slice(0, OPTION_COUNT - 1);

  const opts = [...pool, correct.meaning].sort(() => Math.random() - 0.5);
  return opts;
}

// ─── Option button ────────────────────────────────────────────────
type OptionState = 'idle' | 'correct' | 'wrong' | 'missed';

const OPTION_STYLES: Record<OptionState, { border: string; bg: string; text: string }> = {
  idle:    { border: 'rgba(255,255,255,0.09)', bg: 'rgba(18,18,42,0.9)',       text: '#d1d5db' },
  correct: { border: '#10b981',                bg: 'rgba(16,185,129,0.15)',    text: '#10b981' },
  wrong:   { border: '#ef4444',                bg: 'rgba(239,68,68,0.13)',     text: '#ef4444' },
  missed:  { border: 'rgba(16,185,129,0.4)',   bg: 'rgba(16,185,129,0.08)',    text: '#6b7280' },
};

function OptionButton({
  text, state, onPress,
}: { text: string; state: OptionState; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const s = OPTION_STYLES[state];

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        disabled={state !== 'idle'}
      >
        <BlurView intensity={16} tint="dark" style={{
          borderRadius: 18, overflow: 'hidden',
          borderWidth: state === 'idle' ? 1 : 2,
          borderColor: s.border,
        }}>
          <View style={{
            backgroundColor: s.bg,
            paddingVertical: 16, paddingHorizontal: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{
              color: s.text, fontSize: 15, fontWeight: '500',
              flex: 1, lineHeight: 22,
            }}>
              {text}
            </Text>
            {state === 'correct' && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
            {state === 'wrong'   && <Ionicons name="close-circle"     size={22} color="#ef4444" />}
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Quiz Screen ──────────────────────────────────────────────────
export default function QuizScreen({ route, navigation }: Props) {
  const { mode, topicId, bookId, dueOnly } = route.params;
  const insets = useSafeAreaInsets();

  // Session state
  const [session, setSession]         = useState<GameSession | null>(null);
  const [loadingSession, setLoading]  = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);

  // Quiz progress
  const [qIndex, setQIndex]           = useState(0);
  const [options, setOptions]         = useState<string[]>([]);
  const [optionStates, setOptionStates] = useState<OptionState[]>(['idle','idle','idle','idle']);
  const [answered, setAnswered]       = useState(false);
  const [answers, setAnswers]         = useState<GameAnswer[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(0)).current;
  const cardOpacity  = useRef(new Animated.Value(1)).current;
  const questionStartTime = useRef(Date.now());

  // Prevent back during quiz
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, []);

  // Load session
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<GameSession>('/games/session', {
          params: { type: mode, topicId, bookId, limit: 10,
            ...(dueOnly ? { dueOnly: 'true' } : {}) },
        });
        setSession(res.data);
      } catch (e: any) {
        setLoadError(e?.response?.data?.error ?? "O'yinni boshlab bo'lmadi. Iltimos, qayta urinib ko'ring.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Rebuild options when question changes
  useEffect(() => {
    if (!session?.words.length) return;
    const word = session.words[qIndex];
    setOptions(buildOptions(word, session.words));
    setOptionStates(['idle', 'idle', 'idle', 'idle']);
    setAnswered(false);
    questionStartTime.current = Date.now();

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: (qIndex + 1) / session.words.length,
      duration: 400, useNativeDriver: false,
    }).start();
  }, [qIndex, session]);

  const slideToNext = useCallback(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(cardSlide,   { toValue: -30, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      cardSlide.setValue(30);
      setQIndex(i => i + 1);
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(cardSlide,   { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const submitQuiz = useCallback(async (finalAnswers: GameAnswer[]) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<GameResult>('/games/submit', {
        sessionId: session.sessionId,
        answers: finalAnswers,
      });
      navigation.replace('Result', { result: res.data, mode, sourceScreen: 'Quiz' });
    } catch {
      // Navigate with a synthetic result so the user still sees something
      navigation.replace('Result', {
        result: {
          sessionId: session.sessionId,
          gameType: mode,
          totalQuestions: finalAnswers.length,
          totalCorrect: finalAnswers.filter(a => {
            const word = session.words.find(w => w.id === a.wordId);
            return word?.meaning === a.answer;
          }).length,
          accuracy: 0,
          xpEarned: 0, coinsEarned: 0,
          badgesEarned: [], srsUpdates: [],
        },
        mode, sourceScreen: 'Quiz',
      });
    } finally {
      setSubmitting(false);
    }
  }, [session, mode]);

  const handleAnswer = useCallback((chosen: string) => {
    if (!session || answered) return;
    const word = session.words[qIndex];
    const isCorrect = chosen === word.meaning;
    const timeMs = Date.now() - questionStartTime.current;

    // Update option visual states
    setOptionStates(options.map(o => {
      if (o === word.meaning && !isCorrect) return 'missed';
      if (o === chosen && isCorrect)        return 'correct';
      if (o === chosen && !isCorrect)       return 'wrong';
      return 'idle';
    }));
    setAnswered(true);

    const newAnswers: GameAnswer[] = [
      ...answers,
      { wordId: word.id, answer: chosen, timeMs },
    ];
    setAnswers(newAnswers);

    // Advance after 900ms
    setTimeout(() => {
      if (qIndex + 1 >= session.words.length) {
        submitQuiz(newAnswers);
      } else {
        slideToNext();
      }
    }, 900);
  }, [session, qIndex, options, answered, answers, slideToNext, submitQuiz]);

  // ── Loading ──────────────────────────────────────────────────────
  if (loadingSession) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a',
        alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ color: '#6b7280', fontSize: 15 }}>O'yin yuklanmoqda…</Text>
      </View>
    );
  }

  if (loadError || !session?.words.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a',
        alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <Text style={{ fontSize: 48 }}>{loadError ? '😵' : '📭'}</Text>
        <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          {loadError ?? "So'zlar mavjud emas"}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          {!loadError ? "Avval Lug'at bo'limidan ba'zi so'zlarni qo'shing." : loadError}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{
          backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 14,
          paddingHorizontal: 24, paddingVertical: 12,
          borderWidth: 1, borderColor: '#7c3aed',
        }}>
          <Text style={{ color: '#7c3aed', fontWeight: '600', fontSize: 15 }}>Orqaga qaytish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitting) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a',
        alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ color: '#6b7280', fontSize: 15 }}>Natijalar saqlanmoqda…</Text>
      </View>
    );
  }

  const word     = session.words[qIndex];
  const total    = session.words.length;
  const progress = (qIndex + 1) / total;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, left: -80,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(109,40,217,0.09)',
      }} />

      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 20 }}>

        {/* ── Top bar ─────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center',
          paddingTop: 12, paddingBottom: 18, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>

          {/* Progress bar */}
          <View style={{ flex: 1, height: 6, backgroundColor: '#1f2937', borderRadius: 3 }}>
            <Animated.View style={{
              height: 6, borderRadius: 3,
              width: progressAnim.interpolate({
                inputRange: [0, 1], outputRange: ['0%', '100%'],
              }),
              backgroundColor: '#7c3aed',
              shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8, shadowRadius: 6,
            }} />
          </View>

          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '600', minWidth: 36 }}>
            {qIndex + 1}/{total}
          </Text>
        </View>

        {/* ── Word card ────────────────────────────────────────── */}
        <Animated.View style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardSlide }],
          marginBottom: 28,
        }}>
          <BlurView intensity={22} tint="dark" style={{
            borderRadius: 28, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(109,40,217,0.22)',
          }}>
            <LinearGradient
              colors={['rgba(18,18,48,0.95)', 'rgba(8,8,24,0.98)']}
              style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}
            >
              {/* Topics breadcrumb */}
              {word.wordTopics[0]?.topic && (
                <View style={{
                  backgroundColor: 'rgba(109,40,217,0.15)', borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 4, marginBottom: 20,
                  borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
                }}>
                  <Text style={{ color: '#7c3aed', fontSize: 11, fontWeight: '600' }}>
                    {word.wordTopics[0].topic.name}
                  </Text>
                </View>
              )}

              {/* Japanese word — hero */}
              <Text style={{
                color: '#f9fafb', fontSize: 52, fontWeight: '700',
                letterSpacing: 4, textAlign: 'center', marginBottom: 12,
                textShadowColor: 'rgba(109,40,217,0.4)',
                textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
              }}>
                {word.japaneseWord}
              </Text>

              {/* Hiragana */}
              <Text style={{
                color: '#9ca3af', fontSize: 18, letterSpacing: 2, textAlign: 'center',
              }}>
                {word.hiragana}
              </Text>
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* ── Question label ───────────────────────────────────── */}
        <Text style={{
          color: '#9ca3af', fontSize: 12, fontWeight: '700',
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, textAlign: 'center',
        }}>
          Bu nima degani?
        </Text>

        {/* ── Options ─────────────────────────────────────────── */}
        {options.map((opt, i) => (
          <OptionButton
            key={i}
            text={opt}
            state={optionStates[i]}
            onPress={() => handleAnswer(opt)}
          />
        ))}
      </View>
    </View>
  );
}
