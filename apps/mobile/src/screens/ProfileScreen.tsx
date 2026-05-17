import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

// ── SRS level labels ──────────────────────────────────────────────
const SRS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'New',      color: '#4b5563' },
  1: { label: 'Beginner', color: '#ef4444' },
  2: { label: 'Basic',    color: '#f59e0b' },
  3: { label: 'Familiar', color: '#3b82f6' },
  4: { label: 'Good',     color: '#8b5cf6' },
  5: { label: 'Mastered', color: '#10b981' },
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
function StatCard({ emoji, value, label, color }: {
  emoji: string; value: number | string; label: string; color: string;
}) {
  return (
    <BlurView intensity={18} tint="dark" style={{
      flex: 1, borderRadius: 18, overflow: 'hidden',
      borderWidth: 1, borderColor: color + '30',
    }}>
      <View style={{ backgroundColor: color + '0f', padding: 14, alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        <Text style={{ color: '#f9fafb', fontSize: 20, fontWeight: '800' }}>{value}</Text>
        <Text style={{ color: '#6b7280', fontSize: 11 }}>{label}</Text>
      </View>
    </BlurView>
  );
}

// ── Badge pill ────────────────────────────────────────────────────
function BadgePill({ badge, earned }: { badge: Badge; earned: boolean }) {
  const col = earned ? (badge.color ?? '#7c3aed') : '#374151';
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
        <Text style={{ fontSize: 28 }}>{earned ? (badge.icon ?? '🏅') : '🔒'}</Text>
        <Text style={{ color: earned ? col : '#4b5563', fontSize: 11, fontWeight: '700',
          textAlign: 'center' }} numberOfLines={2}>
          {badge.name}
        </Text>
        {earned && (
          <View style={{
            backgroundColor: col + '33', borderRadius: 6,
            paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Text style={{ color: col, fontSize: 9, fontWeight: '700' }}>EARNED</Text>
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
          SRS Progress
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
function SavedWordRow({ word }: { word: Word }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '700' }}>{word.japaneseWord}</Text>
          {word.hiragana && word.hiragana !== word.japaneseWord && (
            <Text style={{ color: '#7c3aed', fontSize: 12 }}>({word.hiragana})</Text>
          )}
        </View>
        <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {word.meaning}
        </Text>
      </View>
      <Ionicons name="bookmark" size={16} color="#f59e0b" />
    </View>
  );
}

// ── Saved book row ────────────────────────────────────────────────
function SavedBookRow({ book }: { book: Book }) {
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
        <Text style={{ fontSize: 18 }}>📚</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
          {book._count.topics} topic{book._count.topics !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#374151" style={{ marginRight: 4 }} />
      <Ionicons name="bookmark" size={16} color="#f59e0b" />
    </TouchableOpacity>
  );
}

// ── All-badges panel (placeholder list for locked) ────────────────
const BADGE_SHOWCASE: Badge[] = [
  { id: 'b1', name: 'First Step',   description: '', icon: '👣', color: '#10b981', badgeType: 'STREAK',  threshold: 1  },
  { id: 'b2', name: 'Week Warrior', description: '', icon: '🔥', color: '#f59e0b', badgeType: 'STREAK',  threshold: 7  },
  { id: 'b3', name: 'Centurion',    description: '', icon: '💯', color: '#3b82f6', badgeType: 'WORDS',   threshold: 100 },
  { id: 'b4', name: 'Perfectionist',description: '', icon: '✨', color: '#7c3aed', badgeType: 'SCORE',   threshold: 100 },
  { id: 'b5', name: 'Diamond',      description: '', icon: '💠', color: '#b9f2ff', badgeType: 'LEAGUE',  threshold: 5  },
];

// ── Tab type ──────────────────────────────────────────────────────
type SavedTab = 'words' | 'books';

// ── Profile Screen ────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

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
        params: { limit: 100 },
      });
      setSavedWords(data.data);
      setSavedWordsLoaded(true);
    } catch {}
  }, []);

  const fetchSavedBooks = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Book>>('/users/me/saved-books', {
        params: { limit: 100 },
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
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const profile    = user?.profile;
  const league     = profile?.league ?? 'BRONZE';
  const leagueCfg  = LEAGUE[league];
  const leagueLbl  = league.charAt(0) + league.slice(1).toLowerCase();
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
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>Your account</Text>
          <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            Profile 👤
          </Text>
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
                  <Text style={{ fontSize: 16 }}>{leagueCfg.icon}</Text>
                  <Text style={{ color: leagueCfg.color, fontWeight: '700', fontSize: 14 }}>
                    {leagueLbl} League
                  </Text>
                  {leagueCfg.next && (
                    <Ionicons name="chevron-forward" size={14} color={leagueCfg.color} />
                  )}
                </TouchableOpacity>

                {/* Member since */}
                {user?.createdAt && (
                  <Text style={{ color: '#4b5563', fontSize: 11, marginTop: 10 }}>
                    Member since {new Date(user.createdAt).toLocaleDateString('en-US',
                      { month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </LinearGradient>
            </BlurView>

            {/* ── Stats grid ───────────────────────────────────── */}
            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              Statistics
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <StatCard emoji="🔥" value={profile?.streak   ?? 0} label="Streak"   color="#f59e0b" />
              <StatCard emoji="⚡" value={profile?.xp        ?? 0} label="Total XP" color="#7c3aed" />
              <StatCard emoji="🪙" value={profile?.coins     ?? 0} label="Coins"    color="#fbbf24" />
              <StatCard emoji="📚" value={progress?.totalSaved ?? 0} label="Saved"  color="#10b981" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              <StatCard emoji="📝" value={profile?.dailyTestCount  ?? 0} label="Tests today"  color="#3b82f6" />
              <StatCard emoji="🔁" value={profile?.dailyMatchCount ?? 0} label="Matches today" color="#ec4899" />
              <StatCard emoji="⏰" value={progress?.dueTodayCount  ?? 0} label="Due today"    color="#ef4444" />
              <StatCard emoji="🎯" value={totalSrs}                       label="In SRS"       color="#06b6d4" />
            </View>

            {/* ── Saved Words / Books tabs ──────────────────────── */}
            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              My Saved Content
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
                  Words ({savedWords.length})
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
                  Books ({savedBooks.length})
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
                    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                      <Text style={{ fontSize: 36 }}>📝</Text>
                      <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                        No saved words yet — browse the dictionary and tap the bookmark icon!
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
                          ↕ Scroll to see all {savedWords.length} saved words
                        </Text>
                      )}
                    </>
                  )
                ) : (
                  savedBooks.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                      <Text style={{ fontSize: 36 }}>📚</Text>
                      <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                        No saved books yet — go to the dictionary and bookmark your favorites!
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
                          ↕ Scroll to see all {savedBooks.length} saved books
                        </Text>
                      )}
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
              Badges ({earnedIds.size}/{BADGE_SHOWCASE.length + (badges?.length ?? 0 > BADGE_SHOWCASE.length ? (badges?.length ?? 0) - BADGE_SHOWCASE.length : 0)})
            </Text>

            {badges && badges.length === 0 && (
              <BlurView intensity={18} tint="dark" style={{
                borderRadius: 18, overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
              }}>
                <View style={{ backgroundColor: 'rgba(10,10,26,0.85)', padding: 24, alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 36 }}>🏅</Text>
                  <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                    No badges yet — complete games and build streaks!
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
                    Sign Out
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
