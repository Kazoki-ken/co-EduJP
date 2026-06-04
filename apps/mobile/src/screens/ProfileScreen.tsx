import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Dimensions, Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { UserBadge, Badge, LevelCount, Word, Book, PaginatedResponse } from '@vocabjp/shared';

const { width: SCREEN_W } = Dimensions.get('window');

// ── API shapes returned by the backend ──────────────────────────
interface ProgressResponse {
  dueTodayCount: number;
  totalSaved: number;
  levelBreakdown: LevelCount[];
}

// ── League config ─────────────────────────────────────────────────
const LEAGUE: Record<string, { color: string; icon: string; next?: string }> = {
  BRONZE:   { color: '#cd7f32', icon: '🥉', next: 'SILVER' },
  SILVER:   { color: '#c0c0c0', icon: '🥈', next: 'GOLD' },
  GOLD:     { color: '#ffd700', icon: '🥇', next: 'PLATINUM' },
  PLATINUM: { color: '#e5e4e2', icon: '💎', next: 'DIAMOND' },
  DIAMOND:  { color: '#b9f2ff', icon: '💠' },
};

// ── Emoji to Icon Mapping ─────────────────────────────────────────
const EMOJI_TO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  '👣': 'walk',
  '🔥': 'flame',
  '💯': 'ribbon',
  '✨': 'sparkles',
  '💠': 'trophy',
  '🏅': 'medal',
  '🔒': 'lock-closed',
  '🥉': 'medal',
  '🥈': 'medal',
  '🥇': 'medal',
  '💎': 'trophy',
  '📚': 'book',
  '📝': 'create',
  '🔁': 'repeat',
  '⏰': 'time',
  '🎯': 'stats-chart',
  '⚡': 'flash',
  '🪙': 'star',
  '👤': 'person-circle-outline',
};

function getIconForEmoji(emoji: string, defaultIcon: keyof typeof Ionicons.glyphMap = 'medal'): keyof typeof Ionicons.glyphMap {
  if (emoji in EMOJI_TO_ICON) {
    return EMOJI_TO_ICON[emoji];
  }
  return emoji as any;
}

// ── SRS level labels ──────────────────────────────────────────────
const SRS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Yangi',    color: '#4b5563' },
  1: { label: 'Boshlovchi', color: '#ef4444' },
  2: { label: 'Boshlang\'ich', color: '#f59e0b' },
  3: { label: 'Tanish',   color: '#3b82f6' },
  4: { label: 'Yaxshi',   color: '#8b5cf6' },
  5: { label: 'O\'zlashtirilgan', color: '#10b981' },
};

// ── Skeleton bar ──────────────────────────────────────────────────
function SkeletonBar({ w = '100%', h = 14, r = 8 }: { w?: any; h?: number; r?: number }) {
  return (
    <View style={{
      width: w, height: h, borderRadius: r,
      backgroundColor: 'rgba(55,65,81,0.5)',
    }} />
  );
}

// ── Skeleton profile header ───────────────────────────────────────
function ProfileSkeleton() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
        <SkeletonBar w={80} h={80} r={40} />
        <SkeletonBar w={140} h={18} />
        <SkeletonBar w={100} h={13} />
        <SkeletonBar w={90}  h={28} r={14} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0,1,2,3].map(i => <SkeletonBar key={i} w={(SCREEN_W-60)/4} h={80} r={14} />)}
      </View>
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }: {
  icon: keyof typeof Ionicons.glyphMap; value: number | string; label: string; color: string;
}) {
  return (
    <BlurView intensity={18} tint="dark" style={{
      flex: 1, borderRadius: 18, overflow: 'hidden',
      borderWidth: 1, borderColor: color + '30',
    }}>
      <View style={{ backgroundColor: color + '0f', paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '800', marginVertical: 2 }}>{value}</Text>
        <Text style={{ color: '#9ca3af', fontSize: 10, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </BlurView>
  );
}

// ── Badge pill ────────────────────────────────────────────────────
function BadgePill({ badge, earned }: { badge: Badge; earned: boolean }) {
  const col = earned ? (badge.color ?? '#7c3aed') : '#374151';
  const iconName = getIconForEmoji(earned ? (badge.icon ?? '🏅') : '🔒', 'medal');
  return (
    <BlurView intensity={18} tint="dark" style={{
      borderRadius: 16, overflow: 'hidden', marginRight: 10,
      borderWidth: 1, borderColor: earned ? col + '55' : 'rgba(255,255,255,0.06)',
      opacity: earned ? 1 : 0.45,
      width: 110,
    }}>
      <View style={{
        backgroundColor: earned ? col + '18' : 'rgba(18,18,42,0.9)',
        padding: 14, alignItems: 'center', gap: 6,
      }}>
        <Ionicons name={iconName} size={28} color={earned ? col : '#4b5563'} />
        <Text style={{ color: earned ? col : '#4b5563', fontSize: 11, fontWeight: '700',
          textAlign: 'center' }} numberOfLines={2}>
          {badge.name}
        </Text>
        {earned && (
          <View style={{
            backgroundColor: col + '33', borderRadius: 6,
            paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Text style={{ color: col, fontSize: 9, fontWeight: '700' }}>OLINDI</Text>
          </View>
        )}
      </View>
    </BlurView>
  );
}

// ── SRS breakdown bar ─────────────────────────────────────────────
function SrsBreakdown({ levels, total }: { levels: LevelCount[]; total: number }) {
  if (total === 0) return null;
  return (
    <BlurView intensity={18} tint="dark" style={{
      borderRadius: 20, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
      marginBottom: 20,
    }}>
      <View style={{ backgroundColor: 'rgba(10,10,26,0.85)', padding: 18 }}>
        <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14, marginBottom: 12 }}>
          SRS taraqqiyoti
        </Text>
        {/* Stacked bar */}
        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4,
          overflow: 'hidden', marginBottom: 14, backgroundColor: '#1f2937' }}>
          {levels.map(({ level, count }) => {
            const cfg = SRS_LABELS[level] ?? SRS_LABELS[5];
            return (
              <View key={level} style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: cfg.color,
              }} />
            );
          })}
        </View>
        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {levels.map(({ level, count }) => {
            const cfg = SRS_LABELS[level] ?? SRS_LABELS[5];
            return (
              <View key={level} style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />
                <Text style={{ color: '#9ca3af', fontSize: 11 }}>{cfg.label} ({count})</Text>
              </View>
            );
          })}
        </View>
      </View>
    </BlurView>
  );
}

// ── Saved word row ────────────────────────────────────────────────
export function SavedWordRow({ word }: { word: Word }) {
  const [expanded, setExpanded] = useState(false);

  const handleSpeak = async (e: any) => {
    e.stopPropagation();
    Vibration.vibrate(50);
    await Speech.speak(word.japaneseWord, { language: 'ja-JP' });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => setExpanded(!expanded)}
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12, gap: 10 }}>
          {/* Speaker button */}
          <TouchableOpacity
            onPress={handleSpeak}
            activeOpacity={0.7}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(124,58,237,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(124,58,237,0.25)',
            }}
          >
            <Ionicons name="volume-high" size={16} color="#c084fc" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '700' }}>{word.japaneseWord}</Text>
              {word.hiragana && word.hiragana !== word.japaneseWord && (
                <Text style={{ color: '#7c3aed', fontSize: 12 }}>({word.hiragana})</Text>
              )}
            </View>
            <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }} numberOfLines={expanded ? undefined : 1}>
              {word.meaning}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="bookmark" size={16} color="#f59e0b" />
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#4b5563" />
        </View>
      </View>

      {/* Expanded example section */}
      {expanded && (word.exampleSentence || word.exampleTranslation) && (
        <View style={{
          marginTop: 10,
          marginLeft: 42,
          padding: 10,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          borderLeftWidth: 2,
          borderLeftColor: '#7c3aed',
        }}>
          {word.exampleSentence && (
            <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '500' }}>
              {word.exampleSentence}
            </Text>
          )}
          {word.exampleTranslation && (
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
              {word.exampleTranslation}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Saved book row ────────────────────────────────────────────────
export function SavedBookRow({ book }: { book: Book }) {
  const navigation = useNavigation<any>();

  const handlePress = useCallback(() => {
    // Navigate to Dictionary tab, then push to that book's topic list
    navigation.navigate('Dictionary', {
      screen: 'TopicList',
      params: { book },
    });
  }, [navigation, book]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 12,
      }}
    >
      <LinearGradient
        colors={['#7c3aed', '#4c1d95']}
        style={{
          width: 40, height: 40, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="book" size={20} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
          {book._count.topics} ta mavzu
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#374151" style={{ marginRight: 4 }} />
      <Ionicons name="bookmark" size={16} color="#f59e0b" />
    </TouchableOpacity>
  );
}

// ── All-badges panel (placeholder list for locked) ────────────────
const BADGE_SHOWCASE: Badge[] = [
  { id: 'b1', name: 'First Step',   description: '', icon: 'walk', color: '#10b981', badgeType: 'STREAK',  threshold: 1  },
  { id: 'b2', name: 'Week Warrior', description: '', icon: 'flame', color: '#f59e0b', badgeType: 'STREAK',  threshold: 7  },
  { id: 'b3', name: 'Centurion',    description: '', icon: 'ribbon', color: '#3b82f6', badgeType: 'WORDS',   threshold: 100 },
  { id: 'b4', name: 'Perfectionist',description: '', icon: 'sparkles', color: '#7c3aed', badgeType: 'SCORE',   threshold: 100 },
  { id: 'b5', name: 'Diamond',      description: '', icon: 'trophy', color: '#b9f2ff', badgeType: 'LEAGUE',  threshold: 5  },
];

// ── Tab type ──────────────────────────────────────────────────────
type SavedTab = 'words' | 'books';

// ── Profile Screen ────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [progress, setProgress]   = useState<ProgressResponse | null>(null);
  const [badges,   setBadges]     = useState<UserBadge[] | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Saved content state
  const [savedTab, setSavedTab] = useState<SavedTab>('words');
  const [savedWords, setSavedWords] = useState<Word[]>([]);
  const [savedBooks, setSavedBooks] = useState<Book[]>([]);
  const [savedWordsLoaded, setSavedWordsLoaded] = useState(false);
  const [savedBooksLoaded, setSavedBooksLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [prog, bdg] = await Promise.all([
        apiClient.get<ProgressResponse>('/users/me/progress'),
        apiClient.get<UserBadge[]>('/users/me/badges'),
      ]);
      setProgress(prog.data);
      setBadges(bdg.data);
    } catch {
      // silent — keep stale data
    }
  }, []);

  const fetchSavedWords = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Word>>('/users/me/saved-words', {
        params: { limit: 10 },
      });
      setSavedWords(data.data);
      setSavedWordsLoaded(true);
    } catch {}
  }, []);

  const fetchSavedBooks = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Book>>('/users/me/saved-books', {
        params: { limit: 10 },
      });
      setSavedBooks(data.data);
      setSavedBooksLoaded(true);
    } catch {}
  }, []);

  // ── Refetch data every time the Profile tab is focused ───────────
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
      fetchSavedWords();
      refreshUser();
    }, [fetchData, fetchSavedWords, refreshUser]),
  );

  // Lazy-load saved books when tab switches
  useEffect(() => {
    if (savedTab === 'books' && !savedBooksLoaded) fetchSavedBooks();
  }, [savedTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchSavedWords(), fetchSavedBooks()]);
    setRefreshing(false);
  }, [fetchData, fetchSavedWords, fetchSavedBooks]);

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Ishonchingiz komilmi?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: logout },
    ]);
  };

  const profile    = user?.profile;
  const league     = profile?.league ?? 'BRONZE';
  const leagueCfg  = LEAGUE[league];
  const LEAGUE_LABELS: Record<string, string> = {
    BRONZE: 'Bronza ligasi',
    SILVER: 'Kumush ligasi',
    GOLD: 'Oltin ligasi',
    PLATINUM: 'Platina ligasi',
    DIAMOND: 'Olmos ligasi',
  };
  const leagueLabel = LEAGUE_LABELS[league] ?? 'Bronza ligasi';
  const totalSrs   = progress?.levelBreakdown.reduce((s, l) => s + l.count, 0) ?? 0;
  const earnedIds  = new Set(badges?.map(b => b.badge.id) ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orb */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, right: -60,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(109,40,217,0.10)',
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
        {/* ── Header ───────────────────────────────────────────── */}
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>Shaxsiy hisobingiz</Text>
            <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
              Profil
            </Text>
          </View>
          <Ionicons name="person-circle-outline" size={28} color="#7c3aed" />
        </View>

        {/* ── Skeleton while loading ───────────────────────────── */}
        {loading ? <ProfileSkeleton /> : (
          <>
            {/* ── Avatar card ──────────────────────────────────── */}
            <BlurView intensity={20} tint="dark" style={{
              borderRadius: 24, overflow: 'hidden',
              borderWidth: 1, borderColor: 'rgba(109,40,217,0.25)',
              marginBottom: 16,
            }}>
              <LinearGradient
                colors={['rgba(109,40,217,0.16)', 'rgba(10,10,26,0.94)']}
                style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 }}
              >
                {/* Avatar */}
                <LinearGradient colors={['#7c3aed', '#4c1d95']} style={{
                  width: 80, height: 80, borderRadius: 40,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                  shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.55, shadowRadius: 16, elevation: 12,
                }}>
                  <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>
                    {(user?.username?.[0] ?? '?').toUpperCase()}
                  </Text>
                </LinearGradient>

                <Text style={{ color: '#f9fafb', fontSize: 20, fontWeight: '700' }}>
                  {user?.username}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                  {user?.email}
                </Text>

                {/* League pill */}
                <TouchableOpacity style={{
                  marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: leagueCfg.color + '18', borderRadius: 20,
                  paddingHorizontal: 16, paddingVertical: 7,
                  borderWidth: 1, borderColor: leagueCfg.color + '50',
                }}>
                  <Ionicons name={getIconForEmoji(leagueCfg.icon, 'trophy')} size={16} color={leagueCfg.color} />
                  <Text style={{ color: leagueCfg.color, fontWeight: '700', fontSize: 14 }}>
                    {leagueLabel}
                  </Text>
                  {leagueCfg.next && (
                    <Ionicons name="chevron-forward" size={14} color={leagueCfg.color} />
                  )}
                </TouchableOpacity>

                {/* Member since */}
                {user?.createdAt && (
                  <Text style={{ color: '#4b5563', fontSize: 11, marginTop: 10 }}>
                    {new Date(user.createdAt).getFullYear()}{" yildan beri a'zo"}
                  </Text>
                )}
              </LinearGradient>
            </BlurView>

            {/* ── Stats grid ───────────────────────────────────── */}
            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              Statistika
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <StatCard icon="flame" value={profile?.streak   ?? 0} label="Faollik"   color="#f59e0b" />
              <StatCard icon="flash" value={profile?.xp        ?? 0} label="XP"        color="#7c3aed" />
              <StatCard icon="star" value={profile?.coins     ?? 0} label="Tangalar"  color="#fbbf24" />
              <StatCard icon="bookmark" value={progress?.totalSaved ?? 0} label="Saqlangan" color="#10b981" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              <StatCard icon="create" value={profile?.dailyTestCount  ?? 0} label="Test"        color="#3b82f6" />
              <StatCard icon="repeat" value={profile?.dailyMatchCount ?? 0} label="Moslash"     color="#ec4899" />
              <StatCard icon="time" value={progress?.dueTodayCount  ?? 0} label="Takrorlash"  color="#ef4444" />
              <StatCard icon="stats-chart" value={totalSrs}                       label="SRS"           color="#06b6d4" />
            </View>

            {/* ── Saved Words / Books tabs ──────────────────────── */}
            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              Mening saqlanganlarim
            </Text>

            {/* Tab buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setSavedTab('words')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: savedTab === 'words' ? 'rgba(124,58,237,0.15)' : 'rgba(31,41,55,0.5)',
                  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: savedTab === 'words' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <Ionicons name="bookmark" size={14} color={savedTab === 'words' ? '#7c3aed' : '#6b7280'} />
                <Text style={{
                  color: savedTab === 'words' ? '#7c3aed' : '#6b7280',
                  fontWeight: '600', fontSize: 13,
                }}>
                  So'zlar ({savedWords.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSavedTab('books')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: savedTab === 'books' ? 'rgba(249,115,22,0.15)' : 'rgba(31,41,55,0.5)',
                  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: savedTab === 'books' ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <Ionicons name="library" size={14} color={savedTab === 'books' ? '#f97316' : '#6b7280'} />
                <Text style={{
                  color: savedTab === 'books' ? '#f97316' : '#6b7280',
                  fontWeight: '600', fontSize: 13,
                }}>
                  Kitoblar ({savedBooks.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab content */}
            <BlurView intensity={18} tint="dark" style={{
              borderRadius: 20, overflow: 'hidden',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
              marginBottom: 20,
            }}>
              <View style={{ backgroundColor: 'rgba(10,10,26,0.85)', padding: 16 }}>
                {savedTab === 'words' ? (
                  savedWords.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
                      <Ionicons name="document-text-outline" size={44} color="rgba(255,255,255,0.15)" />
                      <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingHorizontal: 12 }}>
                        Hozircha saqlangan so'zlar yo'q — lug'atni ko'rib chiqing va saqlash uchun xatcho'p belgisini bosing!
                      </Text>
                    </View>
                  ) : (
                    <>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        style={{ maxHeight: 320 }}
                        contentContainerStyle={{ paddingBottom: 4 }}
                      >
                        {savedWords.map(w => <SavedWordRow key={w.id} word={w} />)}
                      </ScrollView>
                      {savedWords.length > 4 && (
                        <Text style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                          Barcha {savedWords.length} ta saqlangan so'zni ko'rish uchun pastga aylantiring
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('SavedItems', { type: 'words' })}
                        style={{
                          marginTop: 10,
                          paddingVertical: 12,
                          backgroundColor: 'rgba(124,58,237,0.15)',
                          borderRadius: 14,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(124,58,237,0.3)',
                        }}
                      >
                        <Text style={{ color: '#c084fc', fontSize: 13, fontWeight: '700' }}>
                          Barcha saqlangan so'zlar
                        </Text>
                      </TouchableOpacity>
                    </>
                  )
                ) : (
                  savedBooks.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
                      <Ionicons name="library-outline" size={44} color="rgba(255,255,255,0.15)" />
                      <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingHorizontal: 12 }}>
                        Hozircha saqlangan kitoblar yo'q — lug'atga o'ting va sevimli kitoblaringizni saqlang!
                      </Text>
                    </View>
                  ) : (
                    <>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        style={{ maxHeight: 320 }}
                        contentContainerStyle={{ paddingBottom: 4 }}
                      >
                        {savedBooks.map(b => <SavedBookRow key={b.id} book={b} />)}
                      </ScrollView>
                      {savedBooks.length > 4 && (
                        <Text style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                          Barcha {savedBooks.length} ta saqlangan kitobni ko'rish uchun pastga aylantiring
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('SavedItems', { type: 'books' })}
                        style={{
                          marginTop: 10,
                          paddingVertical: 12,
                          backgroundColor: 'rgba(249,115,22,0.15)',
                          borderRadius: 14,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(249,115,22,0.3)',
                        }}
                      >
                        <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '700' }}>
                          Barcha saqlangan kitoblar
                        </Text>
                      </TouchableOpacity>
                    </>
                  )
                )}
              </View>
            </BlurView>

            {/* ── SRS breakdown ────────────────────────────────── */}
            {progress && (
              <SrsBreakdown
                levels={progress.levelBreakdown}
                total={totalSrs}
              />
            )}

            {/* ── Badges ───────────────────────────────────────── */}
            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              Nishonlar ({earnedIds.size}/{BADGE_SHOWCASE.length + (badges?.length ?? 0 > BADGE_SHOWCASE.length ? (badges?.length ?? 0) - BADGE_SHOWCASE.length : 0)})
            </Text>

            {badges && badges.length === 0 && (
              <BlurView intensity={18} tint="dark" style={{
                borderRadius: 18, overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
              }}>
                <View style={{ backgroundColor: 'rgba(10,10,26,0.85)', padding: 24, alignItems: 'center', gap: 12 }}>
                  <Ionicons name="medal-outline" size={44} color="rgba(255,255,255,0.15)" />
                  <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', paddingHorizontal: 12 }}>
                    Hozircha nishonlar yo'q — o'yinlarni yakunlang va zanjirlar hosil qiling!
                  </Text>
                </View>
              </BlurView>
            )}

            {/* Earned badges row */}
            {badges && badges.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
                contentContainerStyle={{ paddingBottom: 4 }}>
                {badges.map(ub => (
                  <BadgePill key={ub.badge.id} badge={ub.badge} earned />
                ))}
                {/* Locked placeholders */}
                {BADGE_SHOWCASE
                  .filter(b => !earnedIds.has(b.id))
                  .map(b => <BadgePill key={b.id} badge={b} earned={false} />)}
              </ScrollView>
            )}

            {badges && badges.length === 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
                contentContainerStyle={{ paddingBottom: 4 }}>
                {BADGE_SHOWCASE.map(b => <BadgePill key={b.id} badge={b} earned={false} />)}
              </ScrollView>
            )}

            {/* ── Sign out ──────────────────────────────────────── */}
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.85}
              style={{ marginTop: 4 }}>
              <BlurView intensity={18} tint="dark" style={{
                borderRadius: 18, overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)',
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  paddingVertical: 17, gap: 10,
                }}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>
                    Chiqish
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
