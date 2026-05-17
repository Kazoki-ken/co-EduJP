import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DictionaryStackParamList } from '../navigation/DictionaryStack';
import { useBooks, toggleSaveBook } from '../hooks/useVocabulary';
import { BookCardSkeleton } from '../components/Skeletons';
import type { Book } from '@vocabjp/shared';

type Props = NativeStackScreenProps<DictionaryStackParamList, 'BookList'>;

// ─── Colour palette for book cards (cycles through) ──────────────
const CARD_PALETTES: Array<{ colors: [string, string]; glow: string; icon: string }> = [
  { colors: ['#7c3aed', '#4c1d95'], glow: '#7c3aed', icon: '📚' },
  { colors: ['#ec4899', '#9d174d'], glow: '#ec4899', icon: '🌸' },
  { colors: ['#10b981', '#047857'], glow: '#10b981', icon: '🗻' },
  { colors: ['#3b82f6', '#1d4ed8'], glow: '#3b82f6', icon: '💼' },
  { colors: ['#f59e0b', '#b45309'], glow: '#f59e0b', icon: '⛩️' },
  { colors: ['#06b6d4', '#0e7490'], glow: '#06b6d4', icon: '🎌' },
];

// ─── Error banner ─────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{
      margin: 20, padding: 16, borderRadius: 16,
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
      alignItems: 'center', gap: 10,
    }}>
      <Ionicons name="alert-circle" size={28} color="#ef4444" />
      <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={{
        backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10,
        paddingHorizontal: 20, paddingVertical: 8,
      }}>
        <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Book card ────────────────────────────────────────────────────
interface BookCardProps { book: Book; index: number; onPress: () => void }

function BookCard({ book, index, onPress }: BookCardProps) {
  const palette = CARD_PALETTES[index % CARD_PALETTES.length];
  const [saved, setSaved] = useState(!!(book as any).isSaved);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaved(prev => !prev); // optimistic
    try {
      const result = await toggleSaveBook(book.id);
      setSaved(result.saved);
    } catch {
      setSaved(prev => !prev); // revert
    }
    setSaving(false);
  }, [saving, book.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{ flex: 1, margin: 6 }}
    >
      <BlurView intensity={18} tint="dark" style={{
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 1,
        borderColor: saved ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
        minHeight: 150,
      }}>
        <LinearGradient
          colors={['rgba(14,14,32,0.96)', 'rgba(8,8,20,0.99)']}
          style={{ flex: 1, padding: 16 }}
        >
          {/* Top row: Icon + save */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <LinearGradient
              colors={palette.colors}
              style={{
                width: 48, height: 48, borderRadius: 14,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: palette.glow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
              }}
            >
              <Text style={{ fontSize: 22 }}>{palette.icon}</Text>
            </LinearGradient>

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: saved ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1,
                borderColor: saved ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={saved ? '#f59e0b' : '#6b7280'}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text
            numberOfLines={2}
            style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '700', marginBottom: 4 }}
          >
            {book.title}
          </Text>

          {book.description && (
            <Text
              numberOfLines={2}
              style={{ color: '#6b7280', fontSize: 11, lineHeight: 16, marginBottom: 10 }}
            >
              {book.description}
            </Text>
          )}

          {/* Topic count pill */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: palette.glow + '20',
            borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
            alignSelf: 'flex-start',
            borderWidth: 1, borderColor: palette.glow + '40',
          }}>
            <Ionicons name="layers-outline" size={11} color={palette.glow} />
            <Text style={{ color: palette.glow, fontSize: 11, fontWeight: '600' }}>
              {book._count.topics} topic{book._count.topics !== 1 ? 's' : ''}
            </Text>
          </View>
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function DictionaryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useBooks(1, 50);

  const books = data?.data ?? [];
  const filtered = search.trim()
    ? books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    : books;

  // Pair books into rows of 2 for the grid
  const rows: Book[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orb */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, right: -80,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(236,72,153,0.07)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 6, marginBottom: 18 }}>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>Vocabulary</Text>
          <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            Dictionary 📖
          </Text>
          {data && (
            <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
              {data.meta.total} book{data.meta.total !== 1 ? 's' : ''} available
            </Text>
          )}
        </View>

        {/* ── Search ─────────────────────────────────────────── */}
        <BlurView intensity={18} tint="dark" style={{
          borderRadius: 16, overflow: 'hidden',
          borderWidth: 1, borderColor: 'rgba(109,40,217,0.2)',
          marginHorizontal: 6, marginBottom: 20,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(10,10,26,0.8)',
            paddingHorizontal: 14, paddingVertical: 12,
          }}>
            <Ionicons name="search-outline" size={18} color="#4b5563" style={{ marginRight: 10 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search books…"
              placeholderTextColor="#4b5563"
              style={{ flex: 1, color: '#f3f4f6', fontSize: 15 }}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#4b5563" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {/* ── Skeleton grid ──────────────────────────────────── */}
        {loading && !data && (
          <>
            {[0, 1, 2].map(r => (
              <View key={r} style={{ flexDirection: 'row' }}>
                <BookCardSkeleton />
                <BookCardSkeleton />
              </View>
            ))}
          </>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              {search ? 'No books match your search' : 'No vocabulary books yet'}
            </Text>
          </View>
        )}

        {/* ── Book grid ──────────────────────────────────────── */}
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((book, bi) => (
              <BookCard
                key={book.id}
                book={book}
                index={ri * 2 + bi}
                onPress={() => navigation.navigate('TopicList', { book })}
              />
            ))}
            {/* Fill empty cell if odd number of books */}
            {row.length === 1 && <View style={{ flex: 1, margin: 6 }} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
