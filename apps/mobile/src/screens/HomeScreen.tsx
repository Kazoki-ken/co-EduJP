import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { AppTabsParamList } from '../navigation/AppTabs';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Animated entrance hook ────────────────────────────────────────
function useEntrance(delay = 0) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ── Glassmorphism stat card ───────────────────────────────────────
interface StatCardProps {
  emoji: string;
  value: string | number;
  label: string;
  colors: [string, string];
  glowColor: string;
}

function StatCard({ emoji, value, label, colors, glowColor }: StatCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <BlurView
      intensity={22}
      tint="dark"
      style={{
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 4,
      }}
    >
      <LinearGradient
        colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
        style={{ padding: 16, alignItems: 'center' }}
      >
        {/* Glow orb behind emoji */}
        <View
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: glowColor + '22',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
          }}
        >
          <Animated.Text
            style={{ fontSize: 22, transform: [{ scale: pulse }] }}
          >
            {emoji}
          </Animated.Text>
        </View>
        <Text style={{ color: '#f9fafb', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>
          {value}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2, fontWeight: '500' }}>
          {label}
        </Text>
      </LinearGradient>
    </BlurView>
  );
}

// ── Quick action card ─────────────────────────────────────────────
interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: [string, string];
  glowColor: string;
  badge?: string;
  onPress?: () => void;
}

function ActionCard({ title, subtitle, icon, gradientColors, glowColor, badge, onPress }: ActionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <BlurView
          intensity={18} tint="dark"
          style={{
            borderRadius: 20, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <LinearGradient
            colors={['rgba(14,14,32,0.95)', 'rgba(8,8,20,0.98)']}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 18,
            }}
          >
            {/* Icon bubble */}
            <LinearGradient
              colors={gradientColors}
              style={{
                width: 52, height: 52, borderRadius: 16,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 16,
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.55, shadowRadius: 12, elevation: 8,
              }}
            >
              <Ionicons name={icon} size={24} color="#ffffff" />
            </LinearGradient>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#f3f4f6', fontSize: 16, fontWeight: '700' }}>{title}</Text>
                {badge && (
                  <View style={{
                    backgroundColor: '#ef4444', borderRadius: 8,
                    paddingHorizontal: 7, paddingVertical: 2,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#374151" />
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Streak flame component ────────────────────────────────────────
function StreakFlame({ streak }: { streak: number }) {
  const flicker = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1.2,  duration: 700, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.95, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Animated.Text style={{ fontSize: 18, transform: [{ scale: flicker }] }}>🔥</Animated.Text>
      <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 15 }}>{streak} kunlik faollik</Text>
    </View>
  );
}

// ── Home Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, refreshUser, isAuthenticated } = useAuth();
  const insets   = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // ── Auto-refresh user data (XP, coins, streak) on screen focus ──
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refreshUser();
    }, [isAuthenticated, refreshUser]),
  );

  const profile = user?.profile;
  const streak  = profile?.streak  ?? 0;
  const coins   = profile?.coins   ?? 0;
  const xp      = profile?.xp      ?? 0;

  const headerAnim  = useEntrance(0);
  const statsAnim   = useEntrance(100);

  // Navigate into the nested Games or Dictionary stacks
  const goToQuiz = (params: { mode: 'TEST'|'MATCH'|'WRITE'; dueOnly?: boolean }) => {
    if (params.mode === 'MATCH') {
      (navigation as any).navigate('Games', { screen: 'Match', params: {} });
    } else if (params.mode === 'WRITE') {
      (navigation as any).navigate('Games', { screen: 'Write', params: {} });
    } else {
      (navigation as any).navigate('Games', { screen: 'Quiz', params });
    }
  };

  const goToDictionary = () =>
    (navigation as any).navigate('Dictionary', { screen: 'BookList' });

  // League color
  const LEAGUE_COLORS: Record<string, string> = {
    BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700',
    PLATINUM: '#e5e4e2', DIAMOND: '#b9f2ff',
  };
  const leagueColor = LEAGUE_COLORS[profile?.league ?? 'BRONZE'];
  const LEAGUE_LABELS: Record<string, string> = {
    BRONZE: 'Bronza ligasi',
    SILVER: 'Kumush ligasi',
    GOLD: 'Oltin ligasi',
    PLATINUM: 'Platina ligasi',
    DIAMOND: 'Olmos ligasi',
  };
  const leagueLabel = LEAGUE_LABELS[profile?.league ?? 'BRONZE'] ?? 'Bronza ligasi';

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient background orbs */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, left: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(109,40,217,0.10)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: 200, right: -100,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(16,185,129,0.06)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110, // clear floating tab bar
          paddingHorizontal: 20,
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }, headerAnim]}>
          <View>
            <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500', marginBottom: 2 }}>
              こんにちは 👋
            </Text>
            <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
              {user?.username ?? 'Learner'}
            </Text>
            <View style={{ marginTop: 6 }}>
              <StreakFlame streak={streak} />
            </View>
          </View>

          {/* League badge + avatar */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(109,40,217,0.2)',
              borderWidth: 2, borderColor: '#7c3aed',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22 }}>
                {(user?.username?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={{
              backgroundColor: leagueColor + '22',
              borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1, borderColor: leagueColor + '55',
            }}>
              <Text style={{ color: leagueColor, fontSize: 10, fontWeight: '700' }}>
                {leagueLabel}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Combined Streak & Daily Goal side-by-side ───────── */}
        <Animated.View style={[{ flexDirection: 'row', gap: 10, marginBottom: 28 }, statsAnim]}>
          
          {/* Left: Streak/Faollik Card */}
          <BlurView
            intensity={22}
            tint="dark"
            style={{
              flex: 0.38,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <LinearGradient
              colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
              style={{ paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', height: 110 }}
            >
              <View
                style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: '#f59e0b22',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 6,
                  shadowColor: '#f59e0b',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6, shadowRadius: 10, elevation: 4,
                }}
              >
                <Animated.Text style={{ fontSize: 18, transform: [{ scale: pulse }] }}>
                  🔥
                </Animated.Text>
              </View>
              <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '700', letterSpacing: -0.5 }}>
                {streak}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                Faollik
              </Text>
            </LinearGradient>
          </BlurView>

          {/* Right: Daily Goal Card with Progress Bar */}
          <BlurView
            intensity={22}
            tint="dark"
            style={{
              flex: 0.62,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(109,40,217,0.2)',
            }}
          >
            <LinearGradient
              colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
              style={{ padding: 16, justifyContent: 'center', height: 110 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }}>Kunlik maqsad</Text>
                <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 12 }}>
                  {Math.min((profile?.dailyTestCount ?? 0) + (profile?.dailyMatchCount ?? 0) + (profile?.dailyWriteCount ?? 0), 5)}/5
                </Text>
              </View>
              
              {/* Progress track */}
              <View style={{ height: 8, backgroundColor: '#1f2937', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <LinearGradient
                  colors={['#7c3aed', '#10b981']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${Math.min(((profile?.dailyTestCount ?? 0) + (profile?.dailyMatchCount ?? 0) + (profile?.dailyWriteCount ?? 0)) / 5 * 100, 100)}%`,
                  }}
                />
              </View>
              
              <Text style={{ color: '#4b5563', fontSize: 10, fontWeight: '500' }}>
                Muntazamlik ravonlikka olib keladi! ✨
              </Text>
            </LinearGradient>
          </BlurView>

        </Animated.View>

        {/* ── Beautiful Upcoming Ideas Placeholder ───────────── */}
        <BlurView
          intensity={12}
          tint="dark"
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          <Ionicons name="sparkles" size={32} color="rgba(124, 58, 237, 0.4)" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#9ca3af', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
            Yangi g'oyalar kutilmoqda... ✨
          </Text>
          <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
            Tugmalar o'rniga boshqa ilovalardagi eng qulay va qiziqarli imkoniyatlarni bu yerda tez orada birgalikda joylashtiramiz!
          </Text>
        </BlurView>
      </ScrollView>
    </View>
  );
}
