import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DictionaryStackParamList } from '../navigation/DictionaryStack';
import { useTopicWords, toggleSaveWord } from '../hooks/useVocabulary';
import { WordRowSkeleton } from '../components/Skeletons';
import type { Word } from '@vocabjp/shared';

type Props = NativeStackScreenProps<DictionaryStackParamList, 'TopicWords'>;

const WORDS_PER_PAGE = 20;

// ─── SRS level helpers ────────────────────────────────────────────
type SrsLevel = 'new' | 'learning' | 'review' | 'mastered';

function getSrsLabel(word: Word): { level: SrsLevel; label: string; color: string; bg: string } {
  if (!word.isSaved)  return { level: 'new',      label: 'New',      color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
  return              { level: 'learning', label: 'Learning', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
}

// ─── SRS indicator bar ────────────────────────────────────────────
const SRS_COLORS: Record<SrsLevel, string> = {
  new:      '#374151',
  learning: '#f59e0b',
  review:   '#3b82f6',
  mastered: '#10b981',
};
const SRS_FILL: Record<SrsLevel, number> = {
  new: 0, learning: 0.25, review: 0.65, mastered: 1,
};

function SrsBar({ level }: { level: SrsLevel }) {
  const fill  = SRS_FILL[level];
  const color = SRS_COLORS[level];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <View style={{ flex: 1, height: 3, backgroundColor: '#1f2937', borderRadius: 2 }}>
        <View style={{
          width: `${fill * 100}%`, height: 3,
          backgroundColor: color, borderRadius: 2,
        }} />
      </View>
      <Ionicons
        name={level === 'mastered' ? 'checkmark-circle' : 'ellipse-outline'}
        size={12}
        color={color}
      />
    </View>
  );
}

// ─── Word card with save button ───────────────────────────────────
function WordCard({ word, onToggleSave }: { word: Word; onToggleSave: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const srs = getSrsLabel(word);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    onToggleSave(word.id); // optimistic flip
    try {
      const result = await toggleSaveWord(word.id);
      // If the server says the saved state differs from our optimistic flip, correct it
      // (This shouldn't happen in normal flow but keeps things consistent)
      if (result.saved !== !word.isSaved) {
        onToggleSave(word.id); // revert the optimistic flip
      }
    } catch {
      onToggleSave(word.id); // revert on error
    }
    setSaving(false);
  }, [saving, word.id, word.isSaved, onToggleSave]);

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.88}>
      <BlurView intensity={18} tint="dark" style={{
        borderRadius: 18, overflow: 'hidden',
        borderWidth: 1,
        borderColor: word.isSaved ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)',
        marginBottom: 10,
      }}>
        <LinearGradient
          colors={['rgba(14,14,32,0.97)', 'rgba(8,8,20,0.99)']}
          style={{ padding: 16 }}
        >
          {/* ── Top row ─────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{
                color: '#f9fafb', fontSize: 22, fontWeight: '700',
                letterSpacing: 1, marginBottom: 2,
              }}>
                {word.japaneseWord}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 13, letterSpacing: 0.5 }}>
                {word.hiragana}
              </Text>
            </View>

            {/* Save button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: word.isSaved ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: word.isSaved ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={word.isSaved ? '#f59e0b' : '#6b7280'} />
                ) : (
                  <Ionicons
                    name={word.isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={word.isSaved ? '#f59e0b' : '#6b7280'}
                  />
                )}
              </TouchableOpacity>

              {/* SRS badge */}
              <View style={{
                backgroundColor: srs.bg, borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 4,
                borderWidth: 1, borderColor: srs.color + '44',
              }}>
                <Text style={{ color: srs.color, fontSize: 11, fontWeight: '600' }}>
                  {srs.label}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Meaning ─────────────────────────────────────── */}
          <Text style={{ color: '#d1d5db', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
            {word.meaning}
          </Text>

          {/* ── SRS progress bar ────────────────────────────── */}
          <SrsBar level={srs.level} />

          {/* ── Example sentence (expandable) ───────────────── */}
          {word.exampleSentence && (
            <>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 }} />
              {expanded ? (
                <View>
                  <Text style={{ color: '#f3f4f6', fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>
                    {word.exampleSentence}
                  </Text>
                  {word.exampleTranslation && (
                    <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                      {word.exampleTranslation}
                    </Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setExpanded(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="chatbubble-outline" size={12} color="#4b5563" />
                  <Text style={{ color: '#4b5563', fontSize: 12 }}>Show example sentence</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

// ─── Pagination controls ──────────────────────────────────────────
function PaginationBar({
  page, totalPages, onPageChange,
}: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: 1 ... current-1 current current+1 ... last
  const pages: (number | '...')[] = [];
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  addPage(1);
  if (page > 3) pages.push('...');
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) addPage(p);
  if (page < totalPages - 2) pages.push('...');
  if (totalPages > 1) addPage(totalPages);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, marginTop: 20, marginBottom: 10,
    }}>
      {/* Prev */}
      <TouchableOpacity
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: page > 1 ? 'rgba(124,58,237,0.15)' : 'rgba(31,41,55,0.3)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1,
          borderColor: page > 1 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
        }}
      >
        <Ionicons name="chevron-back" size={16} color={page > 1 ? '#7c3aed' : '#374151'} />
      </TouchableOpacity>

      {pages.map((p, i) =>
        p === '...' ? (
          <Text key={`dots-${i}`} style={{ color: '#4b5563', fontSize: 14, marginHorizontal: 2 }}>…</Text>
        ) : (
          <TouchableOpacity
            key={p}
            onPress={() => onPageChange(p)}
            style={{
              minWidth: 36, height: 36, borderRadius: 10,
              backgroundColor: p === page ? 'rgba(124,58,237,0.25)' : 'rgba(31,41,55,0.3)',
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 6,
              borderWidth: 1,
              borderColor: p === page ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <Text style={{
              color: p === page ? '#7c3aed' : '#6b7280',
              fontSize: 13, fontWeight: p === page ? '700' : '400',
            }}>
              {p}
            </Text>
          </TouchableOpacity>
        )
      )}

      {/* Next */}
      <TouchableOpacity
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: page < totalPages ? 'rgba(124,58,237,0.15)' : 'rgba(31,41,55,0.3)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1,
          borderColor: page < totalPages ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
        }}
      >
        <Ionicons name="chevron-forward" size={16} color={page < totalPages ? '#7c3aed' : '#374151'} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Topic Words Screen ───────────────────────────────────────────
export default function TopicWordsScreen({ route, navigation }: Props) {
  const { topic, book } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Paginated fetch — 20 words per page
  const { data, loading, error, refetch } = useTopicWords(topic.id, page, WORDS_PER_PAGE);

  // Local word list for optimistic save updates
  const [localWords, setLocalWords] = useState<Word[] | null>(null);

  // Re-sync from server whenever data changes OR screen re-focuses
  useEffect(() => {
    if (data?.data) setLocalWords(data.data);
  }, [data]);

  // Re-fetch when screen comes back into focus (fixes bug #2: stale isSaved)
  useEffect(() => {
    if (isFocused) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const words = localWords ?? data?.data ?? [];
  const filtered = search.trim()
    ? words.filter(w =>
        w.japaneseWord.includes(search) ||
        w.hiragana.includes(search) ||
        w.meaning.toLowerCase().includes(search.toLowerCase()),
      )
    : words;

  const savedCount = words.filter(w => w.isSaved).length;
  const totalPages = data?.meta ? Math.ceil(data.meta.total / WORDS_PER_PAGE) : 1;

  const handleToggleSave = useCallback((wordId: string) => {
    setLocalWords(prev =>
      (prev ?? []).map(w => w.id === wordId ? { ...w, isSaved: !w.isSaved } : w),
    );
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    setLocalWords(null); // clear local to show skeletons
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, right: -80,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(16,185,129,0.06)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch}
            tintColor="#7c3aed" colors={['#7c3aed']} />
        }
      >
        {/* ── Back ────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' }}
        >
          <Ionicons name="arrow-back" size={20} color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginLeft: 6, fontSize: 14, fontWeight: '500' }}>
            {book.title}
          </Text>
        </TouchableOpacity>

        {/* ── Header + stats ──────────────────────────────────── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>{book.title}</Text>
          <Text style={{
            color: '#f9fafb', fontSize: 22, fontWeight: '700',
            letterSpacing: -0.5, marginBottom: 10,
          }}>
            {topic.name}
          </Text>

          {/* Mini stat pills */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: 'rgba(109,40,217,0.15)', borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
            }}>
              <Ionicons name="text" size={12} color="#7c3aed" />
              <Text style={{ color: '#7c3aed', fontSize: 12, fontWeight: '600' }}>
                {data?.meta.total ?? '…'} words
              </Text>
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
            }}>
              <Ionicons name="bookmark" size={12} color="#f59e0b" />
              <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                {savedCount} saved
              </Text>
            </View>
            {/* Page indicator */}
            {totalPages > 1 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 5,
                borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
              }}>
                <Ionicons name="document-text-outline" size={12} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>
                  Page {page}/{totalPages}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Search ──────────────────────────────────────────── */}
        <BlurView intensity={18} tint="dark" style={{
          borderRadius: 14, overflow: 'hidden',
          borderWidth: 1, borderColor: 'rgba(109,40,217,0.2)',
          marginBottom: 16,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(10,10,26,0.8)',
            paddingHorizontal: 14, paddingVertical: 11,
          }}>
            <Ionicons name="search-outline" size={16} color="#4b5563" style={{ marginRight: 10 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search words, hiragana, meaning…"
              placeholderTextColor="#4b5563"
              style={{ flex: 1, color: '#f3f4f6', fontSize: 14 }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#4b5563" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <View style={{
            padding: 14, borderRadius: 14, marginBottom: 14,
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
            <TouchableOpacity onPress={refetch}>
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Skeletons ───────────────────────────────────────── */}
        {loading && !localWords && (
          [0,1,2,3,4,5].map(i => <WordRowSkeleton key={i} />)
        )}

        {/* ── Empty ───────────────────────────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              {search ? 'No words match your search' : 'No words in this topic yet'}
            </Text>
          </View>
        )}

        {/* ── Word cards ──────────────────────────────────────── */}
        {filtered.map(word => (
          <WordCard key={word.id} word={word} onToggleSave={handleToggleSave} />
        ))}

        {/* ── Pagination ──────────────────────────────────────── */}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </ScrollView>
    </View>
  );
}
