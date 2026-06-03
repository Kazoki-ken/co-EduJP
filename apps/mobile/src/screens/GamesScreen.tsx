import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import apiClient from '../api/client';


type Props = NativeStackScreenProps<GamesStackParamList, 'GameHub'>;

// ─── Mode definitions ─────────────────────────────────────────────
interface GameMode {
  screen: 'Quiz' | 'Mixed' | 'Match' | 'Write' | 'Shooter';
  type: 'TEST' | 'MATCH' | 'WRITE';
  title: string;
  subtitle: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  colors: [string, string];
  glow: string;
  badge?: string;
  dueOnly?: boolean;
}

const MODES: GameMode[] = [
  {
    screen: 'Quiz',  type: 'TEST',
    title: 'Kunlik SRS takrorlash', icon: 'refresh-circle',
    subtitle: "Bugun takrorlash kerak bo'lgan kartochkalar — yodlash asosi",
    colors: ['#10b981', '#047857'], glow: '#10b981', badge: 'KUTILYAPTI', dueOnly: true,
  },
  {
    screen: 'Mixed', type: 'TEST',
    title: 'Aralash sinov', icon: 'shuffle',
    subtitle: '20–25 raund — test va yozish amaliyoti almashib keladi',
    colors: ['#7c3aed', '#4c1d95'], glow: '#7c3aed', badge: 'ARALASH',
  },
  {
    screen: 'Shooter', type: 'TEST',
    title: 'Kosmik otishma', icon: 'rocket',
    subtitle: "Yerga tushishidan oldin so'zlarni portlating 🚀",
    colors: ['#ec4899', '#9d174d'], glow: '#ec4899', badge: 'MASHHUR',
  },
  {
    screen: 'Match', type: 'MATCH',
    title: 'Mos juftliklar', icon: 'copy',
    subtitle: "Yaponcha so'zlarni ularning ma'nolariga moslang",
    colors: ['#f59e0b', '#b45309'], glow: '#f59e0b',
  },
  {
    screen: 'Write', type: 'WRITE',
    title: 'Yozish amaliyoti', icon: 'create',
    subtitle: "Ma'nosini yoddan klaviaturada yozing",
    colors: ['#3b82f6', '#1d4ed8'], glow: '#3b82f6',
  },
  {
    screen: 'Quiz',  type: 'TEST',
    title: 'Tezkor test', icon: 'flash',
    subtitle: '10 ta tezkor savol — tezlikni oshiring',
    colors: ['#06b6d4', '#0e7490'], glow: '#06b6d4',
  },
];

// ─── Due words count banner ───────────────────────────────────────
function DueBanner({ count, onPress }: { count: number | null; onPress: () => void }) {
  const isEmpty = count === 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BlurView intensity={22} tint="dark" style={{
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 1,
        borderColor: isEmpty ? 'rgba(107,114,128,0.3)' : 'rgba(16,185,129,0.35)',
        marginBottom: 24,
      }}>
        <LinearGradient
          colors={isEmpty
            ? ['rgba(18,18,40,0.95)', 'rgba(10,10,26,0.98)']
            : ['rgba(16,185,129,0.12)', 'rgba(10,10,26,0.96)']}
          style={{ flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingVertical: 18 }}
        >
          <View style={{
            width: 52, height: 52, borderRadius: 16,
            backgroundColor: isEmpty ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.2)',
            alignItems: 'center', justifyContent: 'center', marginRight: 16,
            shadowColor: isEmpty ? '#6b7280' : '#10b981',
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
          }}>
            <Text style={{ fontSize: 26 }}>{isEmpty ? '✅' : '🔔'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#f9fafb', fontSize: 16, fontWeight: '700' }}>
              {count === null ? 'Yuklanmoqda…' : isEmpty
                ? 'Barchasi bajarildi!'
                : `Bugun takrorlash uchun ${count} ta so'z bor`}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
              {isEmpty ? 'Yangi takrorlashlar uchun ertaga qaytib keling' : 'SRS takrorlashni boshlash uchun bosing'}
            </Text>
          </View>
          {!isEmpty && count !== null && (
            <View style={{
              backgroundColor: '#10b981', borderRadius: 12,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

// ─── Game mode card ───────────────────────────────────────────────
function ModeCard({ mode, onPress }: { mode: GameMode; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={{ marginBottom: 12 }}>
      <BlurView intensity={18} tint="dark" style={{
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
      }}>
        <LinearGradient
          colors={['rgba(14,14,32,0.96)', 'rgba(8,8,20,0.99)']}
          style={{ flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 18, paddingVertical: 18 }}
        >
          <LinearGradient colors={mode.colors} style={{
            width: 54, height: 54, borderRadius: 17,
            alignItems: 'center', justifyContent: 'center', marginRight: 16,
            shadowColor: mode.glow, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
          }}>
            <Ionicons name={mode.icon} size={26} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#f3f4f6', fontSize: 16, fontWeight: '700' }}>
                {mode.title}
              </Text>
              {mode.badge && (
                <View style={{
                  backgroundColor: mode.glow + 'cc', borderRadius: 8,
                  paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                    {mode.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 3, lineHeight: 18 }}>
              {mode.subtitle}
            </Text>
          </View>

          <Ionicons name="play-circle" size={30} color={mode.glow} style={{ opacity: 0.85 }} />
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

// ─── Games Hub ────────────────────────────────────────────────────
export default function GamesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDueCount = async () => {
    try {
      const res = await apiClient.get('/games/session', {
        params: { type: 'TEST', limit: 50, dueOnly: 'true' },
      });
      setDueCount((res.data?.words ?? []).length);
    } catch {
      setDueCount(0);
    }
  };

  useEffect(() => { loadDueCount(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDueCount();
    setRefreshing(false);
  };

  const startMode = (mode: GameMode) => {
    switch (mode.screen) {
      case 'Mixed':   navigation.navigate('Mixed',   {}); break;
      case 'Shooter': navigation.navigate('Shooter', {}); break;
      case 'Match':   navigation.navigate('Match',   { dueOnly: mode.dueOnly }); break;
      case 'Write':   navigation.navigate('Write',   { dueOnly: mode.dueOnly }); break;
      default:        navigation.navigate('Quiz',    { mode: mode.type, dueOnly: mode.dueOnly });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: -80, left: -60,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(109,40,217,0.11)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 100, right: -80,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(16,185,129,0.07)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor="#7c3aed" colors={['#7c3aed']} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 22 }}>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>Amaliyot</Text>
          <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            O'yinlar 🎮
          </Text>
        </View>

        {/* Due words banner */}
        <DueBanner
          count={dueCount}
          onPress={() => dueCount ? startMode(MODES[0]) : undefined}
        />

        {/* Mode cards */}
        <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
          Mashq rejimlari
        </Text>

        {MODES.map((mode, i) => (
          <ModeCard key={i} mode={mode} onPress={() => startMode(mode)} />
        ))}
      </ScrollView>
    </View>
  );
}
