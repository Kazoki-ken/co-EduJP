import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Animated, Dimensions, BackHandler, Platform,
} from 'react-native';
import { GlassView as BlurView } from '../components/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';
import type { GameSession, SessionWord, GameAnswer, GameResult } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Shooter'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FALL_ZONE_H = SCREEN_H * 0.55;   // how far the word can fall
const BASE_DURATION = 4200;            // ms for first word to fall
const SPEED_STEP    = 130;             // ms faster per correct answer

function buildOptions(word: SessionWord, pool: SessionWord[]): string[] {
  const distractors = pool
    .filter(w => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.meaning);
  while (distractors.length < 3) distractors.push(distractors[0] ?? '—');
  return [...distractors, word.meaning].sort(() => Math.random() - 0.5);
}

// ── Starfield background ─────────────────────────────────────────
//
// OPTIMIZATSIYA: ilgari har bir yulduz o'zining Animated.Value va cheksiz
// Animated.loop iga ega edi — 60 ta yulduz = 60 ta parallel animatsiya,
// va ularning hech biri unmount da to'xtamasdi.
//
// Endi 3 ta umumiy animatsiya qiymati bor, yulduzlar ularni bo'lishib oladi
// (index % 3). Miltillash tasodifiy ko'rinishda qoladi, lekin animatsiya
// tugunlari soni 60 dan 3 ga tushdi.
const TWINKLE_PHASES = 3;

// Androidda yulduz soni kamroq — budjet qurilmalarda har bir View qimmat.
const STAR_COUNT = Platform.OS === 'android' ? 28 : 60;

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i, x: Math.random() * SCREEN_W, y: Math.random() * SCREEN_H,
  size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.6 + 0.2,
}));

/** 3 ta umumiy miltillash animatsiyasi. Unmount da to'xtaydi. */
function useTwinklePhases() {
  const phases = useRef(
    Array.from({ length: TWINKLE_PHASES }, () => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    const loops = phases.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 0.2,
            duration: 1200,
            delay: i * 650,          // fazalarni siljitamiz — bir vaqtda miltillamaydi
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => {
      loops.forEach(l => l.stop());
      phases.forEach(v => v.stopAnimation());
    };
  }, [phases]);

  return phases;
}

const Star = React.memo(function Star({
  x, y, size, opacity, phase,
}: {
  x: number; y: number; size: number; opacity: number; phase: Animated.Value;
}) {
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#fff',
      // Yulduzning o'z yorqinligi umumiy faza bilan ko'paytiriladi
      opacity: Animated.multiply(phase, opacity) }} />
  );
});

/** Butun yulduzli fonni chizadi. React.memo — o'yin state o'zgarganda qayta chizilmaydi. */
const Starfield = React.memo(function Starfield() {
  const phases = useTwinklePhases();
  return (
    <>
      {STARS.map(s => (
        <Star key={s.id} {...s} phase={phases[s.id % TWINKLE_PHASES]} />
      ))}
    </>
  );
});

export default function SpaceShooterScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [session,    setSession]    = useState<GameSession | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Game state
  const [wordIndex,  setWordIndex]  = useState(0);
  const [options,    setOptions]    = useState<string[]>([]);
  const [score,      setScore]      = useState(0);
  const [lives,      setLives]      = useState(3);
  const [answered,   setAnswered]   = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<GameAnswer[]>([]);

  // Animations
  const fallY       = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(1)).current;
  const wordScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const screenFlash = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const fallAnim    = useRef<Animated.CompositeAnimation | null>(null);
  const startedAtQ  = useRef(Date.now());
  const livesRef    = useRef(3);
  const wordIdxRef  = useRef(0);
  const answeredRef = useRef(false);
  const answersRef  = useRef<GameAnswer[]>([]);
  const sessionRef  = useRef<GameSession | null>(null);

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => h.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<GameSession>('/games/session', {
          params: { type: 'TEST', limit: 15 },
        });
        setSession(res.data);
        sessionRef.current = res.data;
      } catch (e: any) {
        setLoadError(e?.response?.data?.error ?? 'Failed to start game.');
      } finally { setLoading(false); }
    })();
  }, []);

  const submitGame = useCallback(async (final: GameAnswer[]) => {
    const s = sessionRef.current;
    if (!s) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post<GameResult>('/games/submit', {
        sessionId: s.sessionId, answers: final,
      });
      navigation.replace('Result', { result: res.data, mode: 'TEST', sourceScreen: 'Shooter' });
    } catch {
      navigation.replace('Result', {
        result: { sessionId: s.sessionId, gameType: 'TEST',
          totalQuestions: final.length, totalCorrect: 0, accuracy: 0,
          xpEarned: 0, coinsEarned: 0, badgesEarned: [], srsUpdates: [] },
        mode: 'TEST', sourceScreen: 'Shooter',
      });
    } finally { setSubmitting(false); }
  }, []);

  // Called when a word reaches the bottom without being answered
  const handleMissed = useCallback(() => {
    if (answeredRef.current) return;
    const s = sessionRef.current;
    if (!s) return;
    const word = s.words[wordIdxRef.current];
    answeredRef.current = true;
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    const missAnswer: GameAnswer = { wordId: word.id, answer: '', timeMs: BASE_DURATION };
    const newAnswers = [...answersRef.current, missAnswer];
    answersRef.current = newAnswers;
    setAnswers(newAnswers);

    // Red flash
    setFlashColor('rgba(239,68,68,0.28)');
    Animated.sequence([
      Animated.timing(screenFlash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(screenFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setFlashColor(null));

    setTimeout(() => advanceWord(newAnswers, newLives), 500);
  }, []);

  const advanceWord = useCallback((currentAnswers: GameAnswer[], currentLives: number) => {
    const s = sessionRef.current;
    if (!s) return;
    const nextIdx = wordIdxRef.current + 1;
    if (nextIdx >= s.words.length || currentLives <= 0) {
      submitGame(currentAnswers);
      return;
    }
    wordIdxRef.current = nextIdx;
    setWordIndex(nextIdx);
    setAnswered(false);
    answeredRef.current = false;
    startedAtQ.current = Date.now();
  }, [submitGame]);

  // Start falling animation for current word
  const startFall = useCallback((idx: number, scoreVal: number) => {
    fallY.setValue(0);
    wordOpacity.setValue(1);
    wordScale.setValue(1);
    glowOpacity.setValue(0);

    const duration = Math.max(1800, BASE_DURATION - scoreVal * SPEED_STEP);
    fallAnim.current = Animated.timing(fallY, {
      toValue: 1, duration, useNativeDriver: false,
    });
    fallAnim.current.start(({ finished }) => {
      if (finished) handleMissed();
    });

    // Update progress
    const s = sessionRef.current;
    if (s) {
      Animated.timing(progressAnim, {
        toValue: (idx + 1) / s.words.length,
        duration: 350, useNativeDriver: false,
      }).start();
    }
  }, [handleMissed]);

  // Start falling whenever wordIndex changes and session is ready
  useEffect(() => {
    if (!session) return;
    setOptions(buildOptions(session.words[wordIndex], session.words));
    startedAtQ.current = Date.now();
    startFall(wordIndex, score);
  }, [wordIndex, session]);

  const handleAnswer = useCallback((chosen: string) => {
    if (answeredRef.current) return;
    const s = sessionRef.current;
    if (!s) return;
    const word = s.words[wordIdxRef.current];
    const isCorrect = chosen === word.meaning;
    const timeMs = Date.now() - startedAtQ.current;

    answeredRef.current = true;
    setAnswered(true);
    fallAnim.current?.stop();

    const newAnswer: GameAnswer = { wordId: word.id, answer: chosen, timeMs };
    const newAnswers = [...answersRef.current, newAnswer];
    answersRef.current = newAnswers;
    setAnswers(newAnswers);

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      // Explode word upward
      Animated.parallel([
        Animated.timing(wordScale,   { toValue: 1.5, duration: 250, useNativeDriver: false }),
        Animated.timing(wordOpacity, { toValue: 0,   duration: 250, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 1,   duration: 120, useNativeDriver: false }),
      ]).start();
      setFlashColor('rgba(16,185,129,0.18)');
      Animated.sequence([
        Animated.timing(screenFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(screenFlash, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setFlashColor(null));
      setTimeout(() => advanceWord(newAnswers, livesRef.current), 420);
    } else {
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      setFlashColor('rgba(239,68,68,0.22)');
      Animated.sequence([
        Animated.timing(screenFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(screenFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setFlashColor(null));
      setTimeout(() => advanceWord(newAnswers, newLives), 750);
    }
  }, [score, advanceWord]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#02020e', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color="#7c3aed" />
      <Text style={{ color: '#6b7280' }}>Preparing launch…</Text>
    </View>
  );
  if (loadError || !session) return (
    <View style={{ flex: 1, backgroundColor: '#02020e', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <Text style={{ fontSize: 40 }}>🛸</Text>
      <Text style={{ color: '#f9fafb', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{loadError ?? 'No words'}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{
        backgroundColor: 'rgba(124,58,237,0.18)', borderRadius: 14,
        paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: '#7c3aed',
      }}>
        <Text style={{ color: '#7c3aed', fontWeight: '600' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
  if (submitting) return (
    <View style={{ flex: 1, backgroundColor: '#02020e', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={{ color: '#6b7280' }}>Calculating score…</Text>
    </View>
  );

  const word = session.words[wordIndex];
  const total = session.words.length;
  const fallYPx = fallY.interpolate({ inputRange: [0, 1], outputRange: [0, FALL_ZONE_H] });

  return (
    <View style={{ flex: 1, backgroundColor: '#02020e' }}>
      {/* Starfield */}
      <Starfield />

      {/* Screen flash overlay */}
      {flashColor && (
        <Animated.View pointerEvents="none" style={{
          ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          backgroundColor: flashColor, opacity: screenFlash, zIndex: 20,
        }} />
      )}

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* ── HUD ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#4b5563" />
            </TouchableOpacity>
            <View style={{ flex: 1, height: 5, backgroundColor: '#0f0f2a', borderRadius: 3 }}>
              <Animated.View style={{
                height: 5, borderRadius: 3,
                backgroundColor: '#7c3aed',
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                shadowColor: '#7c3aed', shadowOpacity: 0.9, shadowRadius: 6,
              }} />
            </View>
            <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600' }}>{wordIndex + 1}/{total}</Text>
          </View>

          {/* Score + Lives */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LinearGradient colors={['#7c3aed', '#4c1d95']} style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
                shadowColor: '#7c3aed', shadowOpacity: 0.8, shadowRadius: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>⚡ {score}</Text>
              </LinearGradient>
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <Text key={i} style={{ fontSize: 18, opacity: i < lives ? 1 : 0.2 }}>❤️</Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── Falling word zone ──────────────────────────────────── */}
        <View style={{ height: FALL_ZONE_H + 60, overflow: 'hidden', position: 'relative' }}>
          {/* Glow burst on destroy */}
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', left: SCREEN_W / 2 - 60, top: 20,
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: 'rgba(16,185,129,0.35)',
            opacity: glowOpacity,
          }} />

          {/* Falling word */}
          <Animated.View style={{
            position: 'absolute', left: 0, right: 0,
            top: fallYPx,
            alignItems: 'center',
            opacity: wordOpacity,
            transform: [{ scale: wordScale }],
          }}>
            <BlurView intensity={20} tint="dark" style={{
              borderRadius: 22, overflow: 'hidden',
              borderWidth: 2, borderColor: 'rgba(109,40,217,0.55)',
            }}>
              <LinearGradient
                colors={['rgba(20,10,50,0.97)', 'rgba(10,5,30,0.99)']}
                style={{ paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center' }}
              >
                <Text style={{
                  color: '#f9fafb', fontSize: 40, fontWeight: '700',
                  letterSpacing: 3,
                  textShadowColor: 'rgba(109,40,217,0.6)',
                  textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
                }}>
                  {word.japaneseWord}
                </Text>
                <Text style={{ color: 'rgba(167,139,250,0.7)', fontSize: 15, letterSpacing: 2, marginTop: 4 }}>
                  {word.hiragana}
                </Text>
              </LinearGradient>
            </BlurView>

            {/* Danger pulse ring when close to bottom */}
          </Animated.View>

          {/* Danger zone line */}
          <View style={{
            position: 'absolute', bottom: 10, left: 20, right: 20,
            height: 1, backgroundColor: 'rgba(239,68,68,0.25)',
          }} />
        </View>

        {/* ── Answer buttons ─────────────────────────────────────── */}
        <View style={{
          flex: 1, paddingHorizontal: 16,
          justifyContent: 'center', gap: 10,
        }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {options.slice(0, 2).map((opt, i) => (
              <TouchableOpacity key={i} onPress={() => handleAnswer(opt)}
                disabled={answered} activeOpacity={0.82} style={{ flex: 1 }}>
                <BlurView intensity={18} tint="dark" style={{
                  borderRadius: 18, overflow: 'hidden',
                  borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
                }}>
                  <View style={{
                    backgroundColor: 'rgba(14,10,40,0.92)',
                    paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center',
                  }}>
                    <Text style={{ color: '#c4b5fd', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{opt}</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {options.slice(2, 4).map((opt, i) => (
              <TouchableOpacity key={i} onPress={() => handleAnswer(opt)}
                disabled={answered} activeOpacity={0.82} style={{ flex: 1 }}>
                <BlurView intensity={18} tint="dark" style={{
                  borderRadius: 18, overflow: 'hidden',
                  borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
                }}>
                  <View style={{
                    backgroundColor: 'rgba(14,10,40,0.92)',
                    paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center',
                  }}>
                    <Text style={{ color: '#c4b5fd', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{opt}</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
